const mongoose = require('mongoose');
const Machine = require('./models/vlite/Machine');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};

// Mock machine data
const mockMachines = [
    {
        machineCode: 'MCH0001',
        name: 'Pressing Machine PB-200',
        type: 'PRESSING_MACHINE',
        specifications: {
            manufacturer: 'SCM Group',
            model: 'Tech Z5',
            serialNumber: 'SN12345678',
            yearOfManufacture: 2020,
            capacity: '2000kg',
            powerRating: '15KW',
        },
        location: {
            workshop: 'Assembly Area',
            bay: 'Station 1',
            floor: 'Ground Floor',
        },
        operationalStatus: 'OPERATIONAL',
        maintenance: {
            lastMaintenanceDate: new Date('2024-12-01'),
            nextMaintenanceDate: new Date('2025-03-01'),
            maintenanceFrequencyDays: 90,
            totalMaintenanceHours: 24,
        },
        performance: {
            totalOperatingHours: 5200,
            totalDowntime: 48,
            utilizationRate: 85,
            efficiency: 92,
            lastOperatedDate: new Date(),
        },
        isActive: true,
    },
    {
        machineCode: 'MCH0002',
        name: 'CNC Router MCH020',
        type: 'CNC_MACHINE',
        specifications: {
            manufacturer: 'Biesse',
            model: 'Rover A FT 1632',
            serialNumber: 'SN87654321',
            yearOfManufacture: 2021,
            capacity: '1600x3200mm',
            powerRating: '25KW',
        },
        location: {
            workshop: 'CNC Area',
            bay: 'Station 2',
            floor: 'Ground Floor',
        },
        operationalStatus: 'OPERATIONAL',
        maintenance: {
            lastMaintenanceDate: new Date('2024-11-15'),
            nextMaintenanceDate: new Date('2025-02-15'),
            maintenanceFrequencyDays: 90,
            totalMaintenanceHours: 18,
        },
        performance: {
            totalOperatingHours: 4800,
            totalDowntime: 36,
            utilizationRate: 78,
            efficiency: 88,
            lastOperatedDate: new Date(),
        },
        isActive: true,
    },
    {
        machineCode: 'MCH0003',
        name: 'EdgeBanding Machine EB-400',
        type: 'EDGEBANDING_MACHINE',
        specifications: {
            manufacturer: 'Homag',
            model: 'Ambition 1630',
            serialNumber: 'SN45678912',
            yearOfManufacture: 2022,
            capacity: '400mm/min',
            powerRating: '12KW',
        },
        location: {
            workshop: 'Finishing Area',
            bay: 'Station 3',
            floor: 'Ground Floor',
        },
        operationalStatus: 'OPERATIONAL',
        maintenance: {
            lastMaintenanceDate: new Date('2024-12-10'),
            nextMaintenanceDate: new Date('2025-03-10'),
            maintenanceFrequencyDays: 90,
            totalMaintenanceHours: 15,
        },
        performance: {
            totalOperatingHours: 3200,
            totalDowntime: 24,
            utilizationRate: 82,
            efficiency: 90,
            lastOperatedDate: new Date(),
        },
        isActive: true,
    },
    {
        machineCode: 'MCH0004',
        name: 'Panel Saw PS-3200',
        type: 'PANEL_SAW',
        specifications: {
            manufacturer: 'Altendorf',
            model: 'F45',
            serialNumber: 'SN78912345',
            yearOfManufacture: 2019,
            capacity: '3200mm',
            powerRating: '7.5KW',
        },
        location: {
            workshop: 'Cutting Area',
            bay: 'Station 4',
            floor: 'Ground Floor',
        },
        operationalStatus: 'UNDER_MAINTENANCE',
        maintenance: {
            lastMaintenanceDate: new Date('2024-12-12'),
            nextMaintenanceDate: new Date('2025-01-12'),
            maintenanceFrequencyDays: 30,
            totalMaintenanceHours: 32,
        },
        performance: {
            totalOperatingHours: 6400,
            totalDowntime: 72,
            utilizationRate: 65,
            efficiency: 85,
            lastOperatedDate: new Date('2024-12-11'),
        },
        isActive: true,
    },
    {
        machineCode: 'MCH0005',
        name: 'Spray Booth SB-10',
        type: 'SPRAY_BOOTH',
        specifications: {
            manufacturer: 'CEFLA',
            model: 'Smart Line',
            serialNumber: 'SN32165498',
            yearOfManufacture: 2021,
            capacity: '10x4x3m',
            powerRating: '20KW',
        },
        location: {
            workshop: 'Painting Area',
            bay: 'Booth 1',
            floor: 'Ground Floor',
        },
        operationalStatus: 'OPERATIONAL',
        maintenance: {
            lastMaintenanceDate: new Date('2024-11-20'),
            nextMaintenanceDate: new Date('2025-02-20'),
            maintenanceFrequencyDays: 90,
            totalMaintenanceHours: 20,
        },
        performance: {
            totalOperatingHours: 2800,
            totalDowntime: 20,
            utilizationRate: 72,
            efficiency: 87,
            lastOperatedDate: new Date(),
        },
        isActive: true,
    },
];

// Seed function
const seedMachines = async () => {
    try {
        await connectDB();

        // Get tenantId from command line or use default
        const tenantId = process.argv[2] || '6935417d57433de522df0bbe';
        console.log(`🌱 Seeding machines for tenant: ${tenantId}`);

        // Add organizationId to all machines
        const machinesWithTenant = mockMachines.map(machine => ({
            ...machine,
            organizationId: tenantId,
        }));

        // Delete existing machines for this tenant (optional)
        const deleteCount = await Machine.deleteMany({ organizationId: tenantId });
        console.log(`🗑️  Deleted ${deleteCount.deletedCount} existing machines`);

        // Insert mock machines one by one to trigger pre-save hooks
        const result = [];
        for (const machineData of machinesWithTenant) {
            const machine = new Machine(machineData);
            await machine.save();
            result.push(machine);
        }

        console.log(`✅ Successfully added ${result.length} machines`);

        // Display added machines
        result.forEach((machine, index) => {
            console.log(`   ${index + 1}. ${machine.name} (${machine.machineCode}) - ${machine.operationalStatus}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding machines:', error);
        process.exit(1);
    }
};

// Run seed
seedMachines();
