// Sample data seeding script for WellnessWay
// Run with: node scripts/seedData.js

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const MedicalShop = require('../models/MedicalShop');
const Hospital = require('../models/Hospital');

const sampleMedicalShops = [
  {
    name: 'City Pharmacy',
    owner: 'John Doe',
    email: 'citypharmacy@example.com',
    phone: '+1234567890',
    address: '123 Main Street, City Center',
    location: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749] // San Francisco
    },
    medicines: [
      {
        name: 'Paracetamol 500mg',
        description: 'Pain reliever and fever reducer',
        price: 25,
        stock: 100,
        category: 'Pain Relief',
        manufacturer: 'Generic'
      },
      {
        name: 'Ibuprofen 400mg',
        description: 'Anti-inflammatory medication',
        price: 35,
        stock: 80,
        category: 'Pain Relief',
        manufacturer: 'Generic'
      },
      {
        name: 'Amoxicillin 250mg',
        description: 'Antibiotic for bacterial infections',
        price: 150,
        stock: 50,
        category: 'Antibiotic',
        manufacturer: 'Generic'
      }
    ],
    openingHours: '9:00 AM - 9:00 PM',
    isActive: true
  },
  {
    name: 'Health Plus Medical Store',
    owner: 'Jane Smith',
    email: 'healthplus@example.com',
    phone: '+1234567891',
    address: '456 Oak Avenue, Downtown',
    location: {
      type: 'Point',
      coordinates: [-122.4094, 37.7849]
    },
    medicines: [
      {
        name: 'Aspirin 100mg',
        description: 'Blood thinner and pain reliever',
        price: 20,
        stock: 120,
        category: 'Cardiovascular',
        manufacturer: 'Generic'
      },
      {
        name: 'Cetirizine 10mg',
        description: 'Antihistamine for allergies',
        price: 30,
        stock: 90,
        category: 'Allergy',
        manufacturer: 'Generic'
      }
    ],
    openingHours: '8:00 AM - 10:00 PM',
    isActive: true
  }
];

const sampleHospitals = [
  {
    name: 'City General Hospital',
    type: 'Public',
    email: 'info@cityhospital.com',
    phone: '+1234567800',
    address: '789 Hospital Road, Medical District',
    location: {
      type: 'Point',
      coordinates: [-122.4294, 37.7649]
    },
    doctors: [
      {
        name: 'Dr. Sarah Johnson',
        specialization: 'Cardiology',
        qualification: 'MD, FACC',
        experience: 15,
        consultationFee: 500,
        availability: 'Mon-Fri, 9 AM - 5 PM',
        isAvailable: true
      },
      {
        name: 'Dr. Michael Chen',
        specialization: 'Pediatrics',
        qualification: 'MD, DCH',
        experience: 10,
        consultationFee: 400,
        availability: 'Mon-Sat, 10 AM - 6 PM',
        isAvailable: true
      },
      {
        name: 'Dr. Emily Davis',
        specialization: 'Dermatology',
        qualification: 'MD, DNB',
        experience: 8,
        consultationFee: 600,
        availability: 'Tue-Thu, 11 AM - 4 PM',
        isAvailable: true
      }
    ],
    tests: [
      {
        name: 'Complete Blood Count (CBC)',
        description: 'Comprehensive blood test',
        price: 500,
        duration: 'Same day',
        category: 'Hematology'
      },
      {
        name: 'Lipid Profile',
        description: 'Cholesterol and triglyceride levels',
        price: 800,
        duration: 'Same day',
        category: 'Cardiology'
      },
      {
        name: 'X-Ray Chest',
        description: 'Chest X-ray examination',
        price: 600,
        duration: '2 hours',
        category: 'Radiology'
      }
    ],
    services: [
      {
        name: 'Emergency Services',
        description: '24/7 emergency care',
        category: 'Emergency'
      },
      {
        name: 'ICU',
        description: 'Intensive care unit',
        category: 'Critical Care'
      },
      {
        name: 'Laboratory Services',
        description: 'Full diagnostic laboratory',
        category: 'Diagnostics'
      }
    ],
    emergencyServices: true,
    bedsAvailable: 50,
    openingHours: '24/7',
    isActive: true
  },
  {
    name: 'Metro Private Hospital',
    type: 'Private',
    email: 'contact@metrohospital.com',
    phone: '+1234567801',
    address: '321 Health Boulevard, Uptown',
    location: {
      type: 'Point',
      coordinates: [-122.4394, 37.7549]
    },
    doctors: [
      {
        name: 'Dr. Robert Wilson',
        specialization: 'Orthopedics',
        qualification: 'MD, MS',
        experience: 20,
        consultationFee: 800,
        availability: 'Mon-Fri, 8 AM - 4 PM',
        isAvailable: true
      },
      {
        name: 'Dr. Lisa Anderson',
        specialization: 'Gynecology',
        qualification: 'MD, DGO',
        experience: 12,
        consultationFee: 700,
        availability: 'Mon-Sat, 9 AM - 5 PM',
        isAvailable: true
      }
    ],
    tests: [
      {
        name: 'MRI Scan',
        description: 'Magnetic resonance imaging',
        price: 5000,
        duration: '1 day',
        category: 'Radiology'
      },
      {
        name: 'CT Scan',
        description: 'Computed tomography scan',
        price: 3000,
        duration: 'Same day',
        category: 'Radiology'
      }
    ],
    services: [
      {
        name: 'Surgery',
        description: 'General and specialized surgery',
        category: 'Surgical'
      },
      {
        name: 'Maternity Services',
        description: 'Complete maternity care',
        category: 'Obstetrics'
      }
    ],
    emergencyServices: true,
    bedsAvailable: 30,
    openingHours: '24/7',
    isActive: true
  }
];

async function seedData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wellnessway', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await MedicalShop.deleteMany({});
    // await Hospital.deleteMany({});
    // console.log('Cleared existing data');

    // Seed Medical Shops
    const shops = await MedicalShop.insertMany(sampleMedicalShops);
    console.log(`✅ Seeded ${shops.length} medical shops`);

    // Seed Hospitals
    const hospitals = await Hospital.insertMany(sampleHospitals);
    console.log(`✅ Seeded ${hospitals.length} hospitals`);

    console.log('\n✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedData();

