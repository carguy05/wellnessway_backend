const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { checkHospitalOwnership, isHospitalOwner } = require('../middleware/owner');

// @route   GET /api/hospitals/nearby
// @desc    Get nearby hospitals based on location
// @access  Public
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 10000 } = req.query; // maxDistance in meters

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    const hospitals = await Hospital.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      },
      isActive: true
    });

    res.json({
      success: true,
      count: hospitals.length,
      data: hospitals
    });
  } catch (error) {
    console.error('Get nearby hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/hospitals
// @desc    Get all hospitals
// @access  Public
router.get('/', async (req, res) => {
  try {
    const hospitals = await Hospital.find({ isActive: true }).limit(100);

    res.json({
      success: true,
      count: hospitals.length,
      data: hospitals
    });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/hospitals/my-hospital
// @desc    Get owner's hospital
// @access  Private/Hospital Owner
router.get('/my-hospital', protect, isHospitalOwner, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ ownerId: req.user.id });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'You do not own any hospital'
      });
    }

    res.json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Get my hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/hospitals/:id
// @desc    Get single hospital by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hospital id'
      });
    }

    const hospital = await Hospital.findById(id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Get hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/hospitals/:id/doctors
// @desc    Get doctors by specialization
// @access  Public
router.get('/:id/doctors', async (req, res) => {
  try {
    const { specialization } = req.query;
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    let doctors = hospital.doctors;
    if (specialization) {
      doctors = doctors.filter(doc => 
        doc.specialization.toLowerCase().includes(specialization.toLowerCase())
      );
    }

    res.json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/hospitals
// @desc    Create new hospital (Admin or Hospital Owner)
// @access  Private/Admin or Hospital Owner
router.post('/', protect, isHospitalOwner, [
  body('name').notEmpty().withMessage('Hospital name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('coordinates').isArray({ min: 2, max: 2 }).withMessage('Coordinates must be an array of 2 numbers')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Check if user already owns a hospital
    if (req.user.role === 'hospital_owner' && req.user.ownedHospital) {
      return res.status(400).json({
        success: false,
        message: 'You already own a hospital'
      });
    }

    const { name, type, email, phone, address, coordinates, doctors, tests, services, emergencyServices, bedsAvailable, openingHours } = req.body;

    const hospital = await Hospital.create({
      name,
      type,
      email: email || req.user.email,
      phone,
      address,
      location: {
        type: 'Point',
        coordinates
      },
      doctors: doctors || [],
      tests: tests || [],
      services: services || [],
      emergencyServices,
      bedsAvailable,
      openingHours,
      ownerId: req.user.id
    });

    // Update user's ownedHospital reference
    if (req.user.role === 'hospital_owner') {
      await User.findByIdAndUpdate(req.user.id, { ownedHospital: hospital._id });
    }

    res.status(201).json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Create hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});



// @route   PUT /api/hospitals/:id/doctors
// @desc    Update doctors list
// @access  Private/Admin or Hospital Owner
router.put('/:id/doctors', protect, checkHospitalOwnership, async (req, res) => {
  try {
    const { doctors } = req.body;
    req.hospital.doctors = doctors;
    await req.hospital.save();

    res.json({
      success: true,
      data: req.hospital
    });
  } catch (error) {
    console.error('Update doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/hospitals/:id/tests
// @desc    Update tests list
// @access  Private/Admin or Hospital Owner
router.put('/:id/tests', protect, checkHospitalOwnership, async (req, res) => {
  try {
    const { tests } = req.body;
    req.hospital.tests = tests;
    await req.hospital.save();

    res.json({
      success: true,
      data: req.hospital
    });
  } catch (error) {
    console.error('Update tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/hospitals/:id/services
// @desc    Update services list
// @access  Private/Admin or Hospital Owner
router.put('/:id/services', protect, checkHospitalOwnership, async (req, res) => {
  try {
    const { services } = req.body;
    req.hospital.services = services;
    await req.hospital.save();

    res.json({
      success: true,
      data: req.hospital
    });
  } catch (error) {
    console.error('Update services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/hospitals/:id
// @desc    Update hospital details
// @access  Private/Admin or Hospital Owner
router.put('/:id', protect, checkHospitalOwnership, [
  body('name').optional().notEmpty().withMessage('Hospital name cannot be empty'),
  body('phone').optional().notEmpty().withMessage('Phone number cannot be empty'),
  body('address').optional().notEmpty().withMessage('Address cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, type, email, phone, address, openingHours, emergencyServices, bedsAvailable, coordinates } = req.body;
    
    if (name) req.hospital.name = name;
    if (type) req.hospital.type = type;
    if (email) req.hospital.email = email;
    if (phone) req.hospital.phone = phone;
    if (address) req.hospital.address = address;
    if (openingHours) req.hospital.openingHours = openingHours;
    if (emergencyServices !== undefined) req.hospital.emergencyServices = emergencyServices;
    if (bedsAvailable !== undefined) req.hospital.bedsAvailable = bedsAvailable;
    if (coordinates) {
      req.hospital.location = {
        type: 'Point',
        coordinates
      };
    }

    await req.hospital.save();

    res.json({
      success: true,
      data: req.hospital
    });
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

