require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Machine = require('../models/vlite/Machine');
const Organization = require('../models/shared/Organization');

// Get organization ID dynamically - will use first active organization
let TENANT_ID = null;

const machinesData = [
  {
    name: 'CNC Router Pro',
    type: 'CNC_MACHINE',
    machineCode: 'MCH0001',
    specifications: {
      manufacturer: 'Biesse',
      model: 'Rover A',
      serialNumber: 'BSS-2023-001',
      yearOfManufacture: 2023,
      capacity: '3200mm x 1600mm',
      powerRating: '15 kW',
      dimensions: { width: 4500, height: 2100, depth: 2000 }
    },
    location: {
      workshop: 'Main Workshop',
      bay: 'Bay 1',
      floor: 'Ground Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2025-01-02'),
      nextMaintenanceDate: new Date('2025-04-02'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 24,
      maintenanceHistory: [
        {
          date: new Date('2025-01-02'),
          type: 'PREVENTIVE',
          description: 'Regular maintenance and calibration',
          performedBy: 'Tech Team',
          downtime: 8
        }
      ]
    },
    performance: {
      totalOperatingHours: 1240,
      totalDowntime: 24,
      utilizationRate: 85,
      efficiency: 92,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: ['Schedule next preventive maintenance']
    },
    isActive: true,
    notes: 'High-performance CNC machine for precision cutting'
  },
  {
    name: 'BeamSaw K460',
    type: 'PANEL_SAW',
    machineCode: 'MCH0002',
    specifications: {
      manufacturer: 'SCM',
      model: 'Accura K460',
      serialNumber: 'SCM-2022-045',
      yearOfManufacture: 2022,
      capacity: '4600mm x 2500mm',
      powerRating: '12 kW',
      dimensions: { width: 5200, height: 2500, depth: 1800 }
    },
    location: {
      workshop: 'Main Workshop',
      bay: 'Bay 2',
      floor: 'Ground Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2024-12-15'),
      nextMaintenanceDate: new Date('2025-03-15'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 18,
      maintenanceHistory: [
        {
          date: new Date('2024-12-15'),
          type: 'PREVENTIVE',
          description: 'Blade replacement and alignment check',
          performedBy: 'Maintenance Crew',
          downtime: 6
        }
      ]
    },
    performance: {
      totalOperatingHours: 2150,
      totalDowntime: 12,
      utilizationRate: 90,
      efficiency: 88,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: ['Blade sharpening due soon']
    },
    isActive: true,
    notes: 'Primary cutting machine for panel processing'
  },
  {
    name: 'EdgeBanding Machine EBM-300',
    type: 'EDGEBANDING_MACHINE',
    machineCode: 'MCH0003',
    specifications: {
      manufacturer: 'Homag',
      model: 'EBM 300',
      serialNumber: 'HMG-2023-078',
      yearOfManufacture: 2023,
      capacity: '2000mm width',
      powerRating: '4.5 kW',
      dimensions: { width: 2400, height: 1200, depth: 900 }
    },
    location: {
      workshop: 'Main Workshop',
      bay: 'Bay 3',
      floor: 'Ground Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2025-01-10'),
      nextMaintenanceDate: new Date('2025-04-10'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 12,
      maintenanceHistory: [
        {
          date: new Date('2025-01-10'),
          type: 'PREVENTIVE',
          description: 'Roller cleaning and glue system check',
          performedBy: 'Service Team',
          downtime: 4
        }
      ]
    },
    performance: {
      totalOperatingHours: 850,
      totalDowntime: 8,
      utilizationRate: 78,
      efficiency: 95,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: []
    },
    isActive: true,
    notes: 'High-precision edge banding for furniture finishing'
  },
  {
    name: 'Panel Saw PSA-2000',
    type: 'PANEL_SAW',
    machineCode: 'MCH0004',
    specifications: {
      manufacturer: 'Altendorf',
      model: 'WA 8',
      serialNumber: 'ALT-2021-034',
      yearOfManufacture: 2021,
      capacity: '2000mm x 1500mm',
      powerRating: '8 kW',
      dimensions: { width: 2800, height: 1800, depth: 1200 }
    },
    location: {
      workshop: 'Main Workshop',
      bay: 'Bay 4',
      floor: 'Ground Floor'
    },
    operationalStatus: 'UNDER_MAINTENANCE',
    maintenance: {
      lastMaintenanceDate: new Date('2024-12-20'),
      nextMaintenanceDate: new Date('2025-03-20'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 30,
      maintenanceHistory: [
        {
          date: new Date('2024-12-20'),
          type: 'CORRECTIVE',
          description: 'Motor repair and blade realignment',
          performedBy: 'External Service',
          downtime: 12
        }
      ]
    },
    performance: {
      totalOperatingHours: 1680,
      totalDowntime: 24,
      utilizationRate: 72,
      efficiency: 85,
      lastOperatedDate: new Date('2024-12-28')
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'MEDIUM',
      recommendedActions: ['Motor bearing inspection needed', 'Blade sharpening']
    },
    isActive: true,
    notes: 'Secondary cutting machine - currently under service'
  },
  {
    name: 'Drill Press DP-500',
    type: 'DRILLING_MACHINE',
    machineCode: 'MCH0005',
    specifications: {
      manufacturer: 'Felder',
      model: 'Concept 500',
      serialNumber: 'FLD-2022-102',
      yearOfManufacture: 2022,
      capacity: '500mm',
      powerRating: '5.5 kW',
      dimensions: { width: 1200, height: 2200, depth: 900 }
    },
    location: {
      workshop: 'Main Workshop',
      bay: 'Bay 5',
      floor: 'Ground Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2025-01-05'),
      nextMaintenanceDate: new Date('2025-04-05'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 10,
      maintenanceHistory: [
        {
          date: new Date('2025-01-05'),
          type: 'PREVENTIVE',
          description: 'Chuck cleaning and spindle check',
          performedBy: 'Maintenance Team',
          downtime: 3
        }
      ]
    },
    performance: {
      totalOperatingHours: 920,
      totalDowntime: 6,
      utilizationRate: 82,
      efficiency: 91,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: []
    },
    isActive: true,
    notes: 'Multi-spindle drilling for hole making operations'
  },
  {
    name: 'Wide Belt Sander WBS-800',
    type: 'SANDING_MACHINE',
    machineCode: 'MCH0006',
    specifications: {
      manufacturer: 'Timesavers',
      model: 'Widebelt 3000',
      serialNumber: 'TMS-2023-056',
      yearOfManufacture: 2023,
      capacity: '800mm width',
      powerRating: '11 kW',
      dimensions: { width: 1500, height: 1800, depth: 2500 }
    },
    location: {
      workshop: 'Finishing Workshop',
      bay: 'Bay 1',
      floor: 'First Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2025-01-08'),
      nextMaintenanceDate: new Date('2025-04-08'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 14,
      maintenanceHistory: [
        {
          date: new Date('2025-01-08'),
          type: 'PREVENTIVE',
          description: 'Belt replacement and dust collection cleaning',
          performedBy: 'Service Technician',
          downtime: 5
        }
      ]
    },
    performance: {
      totalOperatingHours: 1050,
      totalDowntime: 10,
      utilizationRate: 88,
      efficiency: 93,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: ['Next belt change in 45 days']
    },
    isActive: true,
    notes: 'Heavy-duty sanding for surface finishing'
  },
  {
    name: 'Press Lamination Machine PLM-400',
    type: 'PRESSING_MACHINE',
    machineCode: 'MCH0007',
    specifications: {
      manufacturer: 'Meuser',
      model: 'MPS 4000',
      serialNumber: 'MSR-2022-089',
      yearOfManufacture: 2022,
      capacity: '4000mm x 2000mm',
      powerRating: '20 kW',
      dimensions: { width: 4500, height: 2500, depth: 1500 }
    },
    location: {
      workshop: 'Finishing Workshop',
      bay: 'Bay 2',
      floor: 'First Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2024-12-10'),
      nextMaintenanceDate: new Date('2025-03-10'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 20,
      maintenanceHistory: [
        {
          date: new Date('2024-12-10'),
          type: 'PREVENTIVE',
          description: 'Hydraulic pressure check and seal replacement',
          performedBy: 'Authorized Service',
          downtime: 8
        }
      ]
    },
    performance: {
      totalOperatingHours: 1580,
      totalDowntime: 14,
      utilizationRate: 80,
      efficiency: 89,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'MEDIUM',
      recommendedActions: ['Hydraulic fluid level monitoring']
    },
    isActive: true,
    notes: 'Hot press for laminate application and veneer pressing'
  },
  {
    name: 'Cutting Table CT-250',
    type: 'PANEL_SAW',
    machineCode: 'MCH0008',
    specifications: {
      manufacturer: 'Scheppach',
      model: 'CT 3000',
      serialNumber: 'SCH-2021-067',
      yearOfManufacture: 2021,
      capacity: '2500mm length',
      powerRating: '2.2 kW',
      dimensions: { width: 2800, height: 900, depth: 1800 }
    },
    location: {
      workshop: 'Main Workshop',
      bay: 'Bay 6',
      floor: 'Ground Floor'
    },
    operationalStatus: 'BREAKDOWN',
    maintenance: {
      lastMaintenanceDate: new Date('2024-11-15'),
      nextMaintenanceDate: new Date('2025-02-15'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 35,
      maintenanceHistory: [
        {
          date: new Date('2024-11-15'),
          type: 'CORRECTIVE',
          description: 'Blade motor malfunction - waiting for replacement parts',
          performedBy: 'Technician',
          downtime: 20
        }
      ]
    },
    performance: {
      totalOperatingHours: 2300,
      totalDowntime: 48,
      utilizationRate: 55,
      efficiency: 70,
      lastOperatedDate: new Date('2024-11-28')
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'HIGH',
      recommendedActions: ['Urgent motor replacement', 'Blade bearing inspection']
    },
    isActive: true,
    notes: 'Portable cutting table - currently down for motor repair'
  },
  {
    name: 'Packing Bench PB-200',
    type: 'ASSEMBLY_TABLE',
    machineCode: 'MCH0009',
    specifications: {
      manufacturer: 'Custom Built',
      model: 'Standard Workbench',
      serialNumber: 'PBS-2020-001',
      yearOfManufacture: 2020,
      capacity: '200kg',
      powerRating: 'N/A',
      dimensions: { width: 2000, height: 900, depth: 1200 }
    },
    location: {
      workshop: 'Assembly Area',
      bay: 'Station 1',
      floor: 'Ground Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2025-01-15'),
      nextMaintenanceDate: new Date('2025-04-15'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 4,
      maintenanceHistory: [
        {
          date: new Date('2025-01-15'),
          type: 'PREVENTIVE',
          description: 'Surface inspection and minor repairs',
          performedBy: 'Maintenance',
          downtime: 1
        }
      ]
    },
    performance: {
      totalOperatingHours: 1200,
      totalDowntime: 2,
      utilizationRate: 95,
      efficiency: 98,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: []
    },
    isActive: true,
    notes: 'Main assembly and packing workstation'
  },
  {
    name: 'Hardware Assembly Station HAS-100',
    type: 'ASSEMBLY_TABLE',
    machineCode: 'MCH0010',
    specifications: {
      manufacturer: 'Bosch',
      model: 'Assembly Line Module',
      serialNumber: 'BOS-2023-103',
      yearOfManufacture: 2023,
      capacity: '150kg',
      powerRating: '2 kW',
      dimensions: { width: 1800, height: 1000, depth: 1000 }
    },
    location: {
      workshop: 'Assembly Area',
      bay: 'Station 2',
      floor: 'Ground Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2025-01-20'),
      nextMaintenanceDate: new Date('2025-04-20'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 6,
      maintenanceHistory: [
        {
          date: new Date('2025-01-20'),
          type: 'PREVENTIVE',
          description: 'Power tool calibration and testing',
          performedBy: 'Service Team',
          downtime: 2
        }
      ]
    },
    performance: {
      totalOperatingHours: 650,
      totalDowntime: 3,
      utilizationRate: 92,
      efficiency: 96,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: []
    },
    isActive: true,
    notes: 'Hardware assembly workstation for hinges, handles, and fittings'
  },
  {
    name: 'Spray Booth SPR-2000',
    type: 'SPRAY_BOOTH',
    machineCode: 'MCH0011',
    specifications: {
      manufacturer: 'Walther Systeme',
      model: 'Spray Professional',
      serialNumber: 'WLT-2022-071',
      yearOfManufacture: 2022,
      capacity: '2000mm x 1200mm',
      powerRating: '5.5 kW',
      dimensions: { width: 2500, height: 2200, depth: 1500 }
    },
    location: {
      workshop: 'Finishing Workshop',
      bay: 'Bay 3',
      floor: 'First Floor'
    },
    operationalStatus: 'IDLE',
    maintenance: {
      lastMaintenanceDate: new Date('2024-12-01'),
      nextMaintenanceDate: new Date('2025-03-01'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 16,
      maintenanceHistory: [
        {
          date: new Date('2024-12-01'),
          type: 'PREVENTIVE',
          description: 'Filter replacement and ventilation system check',
          performedBy: 'Maintenance',
          downtime: 6
        }
      ]
    },
    performance: {
      totalOperatingHours: 540,
      totalDowntime: 8,
      utilizationRate: 40,
      efficiency: 87,
      lastOperatedDate: new Date('2024-12-28')
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: ['Filter inspection due']
    },
    isActive: true,
    notes: 'Spray finishing booth - currently idle'
  },
  {
    name: 'CNC Router Advanced CR-3000',
    type: 'CNC_MACHINE',
    machineCode: 'MCH0012',
    specifications: {
      manufacturer: 'Homag',
      model: 'BMG 510',
      serialNumber: 'HMG-2023-134',
      yearOfManufacture: 2023,
      capacity: '3000mm x 1500mm',
      powerRating: '18 kW',
      dimensions: { width: 4200, height: 2300, depth: 2100 }
    },
    location: {
      workshop: 'Main Workshop',
      bay: 'Bay 7',
      floor: 'Ground Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2025-01-18'),
      nextMaintenanceDate: new Date('2025-04-18'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 16,
      maintenanceHistory: [
        {
          date: new Date('2025-01-18'),
          type: 'PREVENTIVE',
          description: 'Spindle maintenance and tool changer calibration',
          performedBy: 'Tech Team',
          downtime: 6
        }
      ]
    },
    performance: {
      totalOperatingHours: 680,
      totalDowntime: 10,
      utilizationRate: 87,
      efficiency: 94,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: []
    },
    isActive: true,
    notes: 'Advanced CNC for complex 3D machining operations'
  },
  {
    name: 'Panel Saw Precision PS-350',
    type: 'PANEL_SAW',
    machineCode: 'MCH0013',
    specifications: {
      manufacturer: 'Altendorf',
      model: 'F45 ProDrive',
      serialNumber: 'ALT-2023-089',
      yearOfManufacture: 2023,
      capacity: '3500mm x 2000mm',
      powerRating: '7.5 kW',
      dimensions: { width: 4000, height: 1900, depth: 1500 }
    },
    location: {
      workshop: 'Main Workshop',
      bay: 'Bay 8',
      floor: 'Ground Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2025-01-12'),
      nextMaintenanceDate: new Date('2025-04-12'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 8,
      maintenanceHistory: [
        {
          date: new Date('2025-01-12'),
          type: 'PREVENTIVE',
          description: 'Blade alignment and fence calibration',
          performedBy: 'Maintenance Crew',
          downtime: 3
        }
      ]
    },
    performance: {
      totalOperatingHours: 520,
      totalDowntime: 4,
      utilizationRate: 83,
      efficiency: 91,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: []
    },
    isActive: true,
    notes: 'High-precision panel saw for accurate cutting'
  },
  {
    name: 'EdgeBanding Pro EB-400',
    type: 'EDGEBANDING_MACHINE',
    machineCode: 'MCH0014',
    specifications: {
      manufacturer: 'Biesse',
      model: 'Stream B',
      serialNumber: 'BSS-2022-156',
      yearOfManufacture: 2022,
      capacity: '2500mm width',
      powerRating: '6 kW',
      dimensions: { width: 2800, height: 1300, depth: 1000 }
    },
    location: {
      workshop: 'Main Workshop',
      bay: 'Bay 9',
      floor: 'Ground Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2024-12-28'),
      nextMaintenanceDate: new Date('2025-03-28'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 14,
      maintenanceHistory: [
        {
          date: new Date('2024-12-28'),
          type: 'PREVENTIVE',
          description: 'Glue pot cleaning and pressure roller inspection',
          performedBy: 'Service Team',
          downtime: 5
        }
      ]
    },
    performance: {
      totalOperatingHours: 1120,
      totalDowntime: 12,
      utilizationRate: 79,
      efficiency: 92,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: []
    },
    isActive: true,
    notes: 'Automated edge banding with pre-milling and corner rounding'
  },
  {
    name: 'Multi-Drill Station MDS-600',
    type: 'DRILLING_MACHINE',
    machineCode: 'MCH0015',
    specifications: {
      manufacturer: 'SCM',
      model: 'Morbidelli CX100',
      serialNumber: 'SCM-2023-112',
      yearOfManufacture: 2023,
      capacity: '600mm',
      powerRating: '7 kW',
      dimensions: { width: 1400, height: 2400, depth: 1100 }
    },
    location: {
      workshop: 'Main Workshop',
      bay: 'Bay 10',
      floor: 'Ground Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2025-01-14'),
      nextMaintenanceDate: new Date('2025-04-14'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 10,
      maintenanceHistory: [
        {
          date: new Date('2025-01-14'),
          type: 'PREVENTIVE',
          description: 'Multi-spindle head alignment and bit inspection',
          performedBy: 'Maintenance Team',
          downtime: 4
        }
      ]
    },
    performance: {
      totalOperatingHours: 740,
      totalDowntime: 7,
      utilizationRate: 86,
      efficiency: 93,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: []
    },
    isActive: true,
    notes: 'CNC drilling and dowel insertion machine'
  },
  {
    name: 'Belt Sander Compact BS-500',
    type: 'SANDING_MACHINE',
    machineCode: 'MCH0016',
    specifications: {
      manufacturer: 'Costa',
      model: 'Levigatrice LC',
      serialNumber: 'CST-2022-098',
      yearOfManufacture: 2022,
      capacity: '500mm width',
      powerRating: '7.5 kW',
      dimensions: { width: 1200, height: 1600, depth: 2000 }
    },
    location: {
      workshop: 'Finishing Workshop',
      bay: 'Bay 4',
      floor: 'First Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2025-01-06'),
      nextMaintenanceDate: new Date('2025-04-06'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 12,
      maintenanceHistory: [
        {
          date: new Date('2025-01-06'),
          type: 'PREVENTIVE',
          description: 'Abrasive belt change and dust extraction check',
          performedBy: 'Service Technician',
          downtime: 4
        }
      ]
    },
    performance: {
      totalOperatingHours: 880,
      totalDowntime: 9,
      utilizationRate: 84,
      efficiency: 90,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: []
    },
    isActive: true,
    notes: 'Compact sanding machine for smaller panels'
  },
  {
    name: 'Hydraulic Press HP-1500',
    type: 'PRESSING_MACHINE',
    machineCode: 'MCH0017',
    specifications: {
      manufacturer: 'Dieffenbacher',
      model: 'CPS 1500',
      serialNumber: 'DFF-2021-073',
      yearOfManufacture: 2021,
      capacity: '1500mm x 1000mm',
      powerRating: '15 kW',
      dimensions: { width: 2000, height: 2200, depth: 1300 }
    },
    location: {
      workshop: 'Finishing Workshop',
      bay: 'Bay 5',
      floor: 'First Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2024-12-18'),
      nextMaintenanceDate: new Date('2025-03-18'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 22,
      maintenanceHistory: [
        {
          date: new Date('2024-12-18'),
          type: 'PREVENTIVE',
          description: 'Hydraulic system maintenance and pressure testing',
          performedBy: 'Authorized Service',
          downtime: 10
        }
      ]
    },
    performance: {
      totalOperatingHours: 1820,
      totalDowntime: 18,
      utilizationRate: 76,
      efficiency: 86,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'MEDIUM',
      recommendedActions: ['Monitor hydraulic pressure regularly']
    },
    isActive: true,
    notes: 'Cold press for veneer and laminate bonding'
  },
  {
    name: 'Spray Booth Premium SPR-3000',
    type: 'SPRAY_BOOTH',
    machineCode: 'MCH0018',
    specifications: {
      manufacturer: 'Venjakob',
      model: 'Compact Line',
      serialNumber: 'VNJ-2023-045',
      yearOfManufacture: 2023,
      capacity: '3000mm x 1500mm',
      powerRating: '8 kW',
      dimensions: { width: 3500, height: 2400, depth: 1800 }
    },
    location: {
      workshop: 'Finishing Workshop',
      bay: 'Bay 6',
      floor: 'First Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2025-01-10'),
      nextMaintenanceDate: new Date('2025-04-10'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 12,
      maintenanceHistory: [
        {
          date: new Date('2025-01-10'),
          type: 'PREVENTIVE',
          description: 'Air filtration system cleaning and booth lighting check',
          performedBy: 'Maintenance',
          downtime: 4
        }
      ]
    },
    performance: {
      totalOperatingHours: 620,
      totalDowntime: 6,
      utilizationRate: 68,
      efficiency: 91,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: []
    },
    isActive: true,
    notes: 'Premium spray booth with advanced filtration system'
  },
  {
    name: 'Assembly Workstation AWS-150',
    type: 'ASSEMBLY_TABLE',
    machineCode: 'MCH0019',
    specifications: {
      manufacturer: 'Festool',
      model: 'MFT/3 Professional',
      serialNumber: 'FST-2022-167',
      yearOfManufacture: 2022,
      capacity: '150kg',
      powerRating: '1.5 kW',
      dimensions: { width: 1600, height: 900, depth: 1100 }
    },
    location: {
      workshop: 'Assembly Area',
      bay: 'Station 3',
      floor: 'Ground Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2025-01-22'),
      nextMaintenanceDate: new Date('2025-04-22'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 5,
      maintenanceHistory: [
        {
          date: new Date('2025-01-22'),
          type: 'PREVENTIVE',
          description: 'Work surface refinishing and tool storage organization',
          performedBy: 'Maintenance',
          downtime: 2
        }
      ]
    },
    performance: {
      totalOperatingHours: 890,
      totalDowntime: 3,
      utilizationRate: 91,
      efficiency: 95,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: []
    },
    isActive: true,
    notes: 'Mobile assembly workstation with clamping system'
  },
  {
    name: 'Quality Control Station QCS-100',
    type: 'ASSEMBLY_TABLE',
    machineCode: 'MCH0020',
    specifications: {
      manufacturer: 'Custom Built',
      model: 'QC Inspection Table',
      serialNumber: 'QCS-2023-008',
      yearOfManufacture: 2023,
      capacity: '200kg',
      powerRating: 'N/A',
      dimensions: { width: 2500, height: 950, depth: 1300 }
    },
    location: {
      workshop: 'Assembly Area',
      bay: 'Station 4',
      floor: 'Ground Floor'
    },
    operationalStatus: 'OPERATIONAL',
    maintenance: {
      lastMaintenanceDate: new Date('2025-01-25'),
      nextMaintenanceDate: new Date('2025-04-25'),
      maintenanceFrequencyDays: 90,
      totalMaintenanceHours: 3,
      maintenanceHistory: [
        {
          date: new Date('2025-01-25'),
          type: 'PREVENTIVE',
          description: 'Measuring equipment calibration',
          performedBy: 'QC Team',
          downtime: 1
        }
      ]
    },
    performance: {
      totalOperatingHours: 450,
      totalDowntime: 1,
      utilizationRate: 88,
      efficiency: 97,
      lastOperatedDate: new Date()
    },
    aiMaintenancePrediction: {
      failureRiskLevel: 'LOW',
      recommendedActions: []
    },
    isActive: true,
    notes: 'Final inspection and quality control workstation'
  }
];

const seedMachines = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Get the first active organization dynamically
    const organization = await Organization.findOne({ isActive: true }).sort({ createdAt: 1 });
    if (!organization) {
      console.error('❌ No active organization found. Please create an organization first.');
      process.exit(1);
    }
    
    TENANT_ID = organization._id;
    console.log(`📦 Using organization: ${organization.name} (${TENANT_ID})`);

    // Check if machines already exist
    const existingCount = await Machine.countDocuments({ organizationId: TENANT_ID });
    
    if (existingCount > 0) {
      console.log(`⚠️  ${existingCount} machines already exist. Skipping seed...`);
      process.exit(0);
    }

    // Add organizationId to each machine
    const machinesWithOrg = machinesData.map(machine => ({
      ...machine,
      organizationId: TENANT_ID
    }));

    const result = await Machine.insertMany(machinesWithOrg);
    console.log(`✅ Successfully seeded ${result.length} machines`);
    
    result.forEach(machine => {
      console.log(`  • ${machine.machineCode} - ${machine.name} (${machine.operationalStatus})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding machines:', error);
    process.exit(1);
  }
};

seedMachines();
