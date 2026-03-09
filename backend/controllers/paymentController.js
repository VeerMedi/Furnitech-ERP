const AdvancePayment = require('../models/vlite/AdvancePayment');

exports.getPayments = async (req, res) => {
  try {
    const payments = await AdvancePayment.find({ organization: req.user.organization })
      .populate('customer', 'name')
      .populate('quotation', 'referenceNumber')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createPayment = async (req, res) => {
  try {
    const payment = new AdvancePayment({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user._id
    });
    await payment.save();
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const payment = await AdvancePayment.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization },
      req.body,
      { new: true }
    );
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const payment = await AdvancePayment.findOneAndDelete({ _id: req.params.id, organization: req.user.organization });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
