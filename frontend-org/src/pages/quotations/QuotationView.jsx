import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Send, Check, X, Edit } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useEditPermission } from '../../components/ProtectedAction';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from '../../hooks/useToast';
import { confirm } from '../../hooks/useConfirm';

const QuotationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const canEditQuotations = useEditPermission('quotations');
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const quotationRef = useRef(null); // Ref for PDF generation

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      const res = await api.get(`/quotations/${id}`);
      console.log('Quotation data:', res.data);
      let quotationData = res.data.data || res.data;

      // Calculate summary if missing
      if (!quotationData.taxableAmount || !quotationData.totalAmount) {
        let taxableAmount = 0;
        let totalTax = 0;

        quotationData.items?.forEach(item => {
          const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
          const taxRate = (item.taxPerUnit || 18) / 100;
          const taxAmount = lineTotal * taxRate;
          taxableAmount += lineTotal;
          totalTax += taxAmount;
        });

        const cgst = totalTax / 2;
        const sgst = totalTax / 2;
        const totalAmount = taxableAmount + totalTax - (quotationData.discount || 0);

        quotationData = {
          ...quotationData,
          taxableAmount,
          cgst,
          sgst,
          totalAmount
        };
      }

      setQuotation(quotationData);
    } catch (err) {
      console.error('Error fetching quotation:', err);
      toast.error('Error loading quotation');
      navigate('/quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info('Generating PDF...');
      const response = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quotation-${quotation.quotationNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Error generating PDF. Please try again.');
    }
  };

  const handleSendEmail = async () => {
    const confirmed = await confirm('Send this quotation to the customer via email?', 'Send Quotation');
    if (!confirmed) return;
    try {
      await api.post(`/quotations/${id}/send`);
      toast.success('Quotation sent successfully! ✅');
      fetchQuotation();
    } catch (err) {
      console.error('Error sending quotation:', err);
      toast.error(err.response?.data?.message || 'Error sending quotation');
    }
  };

  const handleApprove = async () => {
    const confirmed = await confirm('Approve this quotation?', 'Approve Quotation');
    if (!confirmed) return;
    try {
      await api.patch(`/quotations/${id}/approve`, { comments: 'Approved' });
      toast.success('Quotation approved successfully! ✅');
      localStorage.setItem('inquiryNeedsRefresh', Date.now().toString());
      fetchQuotation();
    } catch (err) {
      console.error('Error approving quotation:', err);
      toast.error(err.response?.data?.message || 'Error approving quotation');
    }
  };

  const handleReject = async () => {
    const comments = window.prompt('Enter rejection reason:');
    if (!comments) return;
    try {
      await api.patch(`/quotations/${id}/reject`, { comments });
      toast.success('Quotation rejected');
      fetchQuotation();
    } catch (err) {
      console.error('Error rejecting quotation:', err);
      toast.error(err.response?.data?.message || 'Error rejecting quotation');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-600">Loading quotation...</div></div>;
  if (!quotation) return <div className="flex items-center justify-center h-64"><div className="text-gray-600">Quotation not found</div></div>;

  return (
    <div className="p-6 max-w-[210mm] mx-auto">
      {/* Action Bar - No Print */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button variant="outline" onClick={() => navigate('/quotations')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to List
        </Button>
        <div className="flex gap-2">
          {canEditQuotations && (
            <Button variant="outline" onClick={() => navigate(`/quotations/${id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            Print
          </Button>
          {canEditQuotations && quotation.approvalStatus !== 'SENT' && (
            <Button onClick={handleSendEmail}>
              <Send className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          )}
          {canEditQuotations && quotation.approvalStatus !== 'APPROVED' && quotation.approvalStatus !== 'REJECTED' && (
            <>
              <Button variant="success" onClick={handleApprove}>
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button variant="danger" onClick={handleReject}>
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Printable Quotation - White A4 style background */}
      <div ref={quotationRef} className="bg-white text-black p-8 shadow-lg print:shadow-none print:p-0 min-h-[297mm] text-xs font-sans">

        {/* Header Section */}
        <div className="flex justify-between mb-8">
          {/* Logo (Left) */}
          <div className="w-1/3">
            <img
              src="/assets/vlite-logo.jpg"
              alt="Vlite Furnitures"
              className="h-20 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                // Force refresh if needed or just hide
              }}
            />
            {/* Fallback if image fails to load entirely - though we expect it to work now */}
          </div>

          {/* Company Details (Right) */}
          <div className="w-1/2 text-right text-[10px]">
            <p className="font-bold text-red-700 text-sm">C-329, 334, 3rd Floor, Antop Hill, Ware housing Co. Ltd</p>
            <p className="text-gray-700">Vrt College Road, Wadala (E), Mumbai - 400037</p>
            <p className="text-gray-800 font-semibold mt-1">022 - 50020256 / 50020069 | sales@vlitefurnitech.com</p>
          </div>
        </div>

        {/* Customer & Date Section */}
        <div className="flex justify-between mb-4">
          <div className="w-2/3">
            <p className="font-bold mb-1">Bill To:</p>
            <div className="text-[10px] leading-tight">
              <p className="font-semibold">{quotation.customerName || quotation.customer?.companyName || 'N/A'}</p>
              <p>{quotation.customerAddress || quotation.customer?.billingAddress?.address || ''}</p>
              <p>{quotation.customer?.billingAddress?.city} {quotation.customer?.billingAddress?.pincode}</p>
              <p>Contact: {quotation.customerPhone || quotation.customer?.phone || ''}</p>
              <p>Email: {quotation.customerEmail || quotation.customer?.primaryEmail || ''}</p>
            </div>
          </div>
          <div className="w-1/3 text-right">
            <p className="text-[10px] font-bold">Date</p>
            <p className="text-[10px] border px-2 py-1 inline-block">{new Date(quotation.validFrom).toLocaleDateString('en-IN')}</p>

            {/* Reference Layout File */}
            {quotation.scannedLayout && quotation.scannedLayout.status === 'COMPLETED' && (
              <div className="mt-2 text-[9px] text-gray-600">
                <p className="font-bold">Ref Layout:</p>
                <p className="truncate max-w-[150px] ml-auto">
                  {quotation.scannedLayout.filename ? quotation.scannedLayout.filename.split('_').slice(1).join('_') : 'Scanned File'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Greeting & Title */}
        <div className="mb-4">
          <p className="text-[10px] mb-2">Dear Sir/Ma'am,</p>
          <p className="text-[10px] mb-4">We are thankful to you for giving us the opportunity to forward our quotation.</p>
          <h2 className="text-center font-bold text-sm border-b pb-1 mb-4">Quotation Modular Furniture ( Mumbai )</h2>
        </div>

        {/* Main Table */}
        <div className="mb-4">
          <table className="w-full border-collapse border border-black text-[9px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-1 py-1 w-10 text-center">Sr.No</th>
                <th className="border border-black px-1 py-1 w-24 text-center">Layout Description</th>
                <th className="border border-black px-1 py-1 text-center">Description</th>
                <th className="border border-black px-1 py-1 w-12 text-center">Qty/ in Nos</th>
                <th className="border border-black px-1 py-1 w-16 text-center">Rate</th>
                <th className="border border-black px-1 py-1 w-20 text-center">Amount</th>
                <th className="border border-black px-1 py-1 w-16 text-center">Image</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-black px-1 py-2 text-center">{index + 1}</td>
                  <td className="border border-black px-1 py-2">{item.layoutDescription || ''}</td>
                  <td className="border border-black px-1 py-2">
                    {/* Enhanced Description with Material Breakdown */}
                    {item.specifications?.subItems?.length > 0 ? (
                      <div className="space-y-1">
                        {/* Main Product Header with Dimensions */}
                        {item.layoutDescription && (
                          <div className="text-[10px] font-bold mb-2">
                            {item.layoutDescription}
                            {item.dimensions && (
                              <span className="text-red-600">: {item.dimensions}</span>
                            )}
                          </div>
                        )}

                        {/* Sub-items with detailed specifications */}
                        {item.specifications.subItems.map((sub, idx) => (
                          <div key={idx} className="text-[9px] leading-tight mb-0.5">
                            {!sub.isText ? (
                              <>
                                {/* Component name */}
                                <span className="font-medium">{sub.description || sub.name}</span>

                                {/* Dimensions in RED */}
                                {sub.dimensions && (
                                  <span className="text-red-600 font-semibold"> {sub.dimensions}</span>
                                )}

                                {/* Material specification */}
                                {sub.material && (
                                  <span className="text-gray-800"> {sub.material}</span>
                                )}

                                {/* Rate in BLUE */}
                                {sub.unitPrice > 0 && (
                                  <span className="text-blue-600"> @ ₹{sub.unitPrice.toLocaleString('en-IN')}</span>
                                )}

                                {/* Quantity if more than 1 */}
                                {sub.quantity > 1 && (
                                  <span className="text-gray-600"> ({String(sub.quantity).padStart(2, '0')}-Nos)</span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-600 italic">{sub.description}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        {/* Fallback to simple description */}
                        <div className="text-[9px] whitespace-pre-wrap">{item.description}</div>
                        {item.details && (
                          <div className="mt-1 text-[8px] text-gray-600 italic border-t border-gray-300 pt-1">
                            {item.details}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="border border-black px-1 py-2 text-center">{item.quantity}</td>
                  <td className="border border-black px-1 py-2 text-right">
                    {item.unitPrice ? item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="border border-black px-1 py-2 text-right">
                    {item.amount ? item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="border border-black px-1 py-2 text-center">
                    {/* Placeholder for image if available */}
                  </td>
                </tr>
              ))}
              {/* Fill specific empty rows if less than 7 to match PDF look? Optional. */}
            </tbody>
          </table>
        </div>

        {/* Summary & Bank Details Section */}
        <div className="flex justify-between mb-4">
          {/* Left Side: Bank Details Placeholders (or layout space) - shifted below */}
          <div className="w-1/2"></div>

          {/* Right Side: Totals */}
          <div className="w-1/2 flex justify-end">
            <div className="w-64 text-[10px]">
              <div className="flex justify-between py-1"><span>Total</span> <span className="text-right w-24">{quotation.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between py-1"><span>Transportation</span> <span className="text-right w-24">0</span></div>
              <div className="flex justify-between py-1"><span>CGST 9%</span> <span className="text-right w-24">{quotation.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between py-1"><span>SGST 9%</span> <span className="text-right w-24">{quotation.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between py-1 font-bold border-t border-black mt-1 pt-1"><span>Grand Total</span> <span className="text-right w-24">{quotation.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="mb-6">
          <h3 className="font-bold text-[10px] mb-1">Terms & Conditions:</h3>
          <ul className="list-decimal list-inside text-[9px] space-y-1">
            {(quotation.termsAndConditions || []).map((term, i) => (
              <li key={i}>{term}</li>
            ))}
            {quotation.notes && <li>Note: {quotation.notes}</li>}
          </ul>
        </div>

        {/* Bank & Footer Details */}
        <div className="flex justify-between items-end">
          <div className="text-[9px]">
            <p className="font-bold">Company Name: Vlite Furnitech LLP</p>

            {quotation.bankDetails?.bankName ? (
              <>
                <p>Bank Name: {quotation.bankDetails.bankName}</p>
                <p>Branch: {quotation.bankDetails.branch}</p>
                <p>Account No: {quotation.bankDetails.accountNumber}</p>
                <p>IFSC Code: {quotation.bankDetails.ifscCode}</p>
              </>
            ) : (
              <>
                <p>Bank Name: DBS Bank</p>
                <p>Branch: Todi</p>
                <p>Account No: 1000000001</p>
                <p>IFSC Code: DBSS0IN0811</p>
              </>
            )}

            <div className="mt-2 text-right w-full absolute left-48 bottom-32 hidden"> {/* Hidden overlay layout fix */} </div>
          </div>

          <div className="text-[9px] text-right">
            <p>PAN No: AAHFV8261D</p>
            <p>Reg. No: AAH-FV-8261-D</p>
            <p>GST: 27AAHFV8261D1ZR</p>
          </div>
        </div>

        {/* Signature */}
        <div className="mt-12 flex justify-end">
          <div className="text-center">
            <p className="font-bold text-[10px] mb-8">For Vlite Furnitech LLP</p>
            <p className="text-[9px]">{quotation.createdBy?.firstName} {quotation.createdBy?.lastName || ''}</p>
            <p className="text-[9px]">Contact Number</p>
            <p className="text-[9px]">Designation</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default QuotationView;
