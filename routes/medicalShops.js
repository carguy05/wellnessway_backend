const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const MedicalShop = require('../models/MedicalShop');
const User = require('../models/User');
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/auth');
const { checkShopOwnership, isShopOwner } = require('../middleware/owner');

// @route   GET /api/medical-shops/nearby
// @desc    Get nearby medical shops based on location
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

    const shops = await MedicalShop.find({
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
    }).select('-reviews.userId');

    res.json({
      success: true,
      count: shops.length,
      data: shops
    });
  } catch (error) {
    console.error('Get nearby shops error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/medical-shops
// @desc    Get all medical shops
// @access  Public
router.get('/', async (req, res) => {
  try {
    const shops = await MedicalShop.find({ isActive: true })
      .select('-reviews.userId')
      .limit(100);

    res.json({
      success: true,
      count: shops.length,
      data: shops
    });
  } catch (error) {
    console.error('Get shops error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/medical-shops/:id
// @desc    Get single medical shop by ID
// @access  Public
// NOTE: keep more specific routes (like `/my-shop`) above `/:id` so
// paths such as `/my-shop` don't get treated as an `:id` param.

// @route   POST /api/medical-shops/:id/reviews
// @desc    Add review to medical shop
// @access  Private
router.post('/:id/reviews', protect, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const shop = await MedicalShop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Medical shop not found'
      });
    }

    const { rating, comment } = req.body;

    shop.reviews.push({
      userId: req.user.id,
      rating,
      comment
    });

    await shop.save();

    res.status(201).json({
      success: true,
      data: shop
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/medical-shops
// @desc    Create new medical shop (Admin or Shop Owner)
// @access  Private/Admin or Shop Owner
router.post('/', protect, isShopOwner, [
  body('name').notEmpty().withMessage('Shop name is required'),
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

    // Check if user already owns a shop
    if (req.user.role === 'medical_shop_owner' && req.user.ownedShop) {
      return res.status(400).json({
        success: false,
        message: 'You already own a medical shop'
      });
    }

    const { name, owner, email, phone, address, coordinates, medicines, openingHours } = req.body;

    const shop = await MedicalShop.create({
      name,
      owner: owner || req.user.name,
      email: email || req.user.email,
      phone,
      address,
      location: {
        type: 'Point',
        coordinates
      },
      medicines: medicines || [],
      openingHours,
      ownerId: req.user.id
    });

    // Update user's ownedShop reference
    if (req.user.role === 'medical_shop_owner') {
      await User.findByIdAndUpdate(req.user.id, { ownedShop: shop._id });
    }

    res.status(201).json({
      success: true,
      data: shop
    });
  } catch (error) {
    console.error('Create shop error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/medical-shops/my-shop
// @desc    Get owner's medical shop
// @access  Private/Shop Owner
router.get('/my-shop', protect, isShopOwner, async (req, res) => {
  try {
    const shop = await MedicalShop.findOne({ ownerId: req.user.id });
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'You do not own any medical shop'
      });
    }

    res.json({
      success: true,
      data: shop
    });
  } catch (error) {
    console.error('Get my shop error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/medical-shops/:id
// @desc    Get single medical shop by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const shop = await MedicalShop.findById(id).select('-reviews.userId');
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Medical shop not found'
      });
    }

    res.json({
      success: true,
      data: shop
    });
  } catch (error) {
    console.error('Get shop error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/medical-shops/:id/medicines
// @desc    Update medicine stock
// @access  Private/Admin or Shop Owner
router.put('/:id/medicines', protect, checkShopOwnership, async (req, res) => {
  try {
    const { medicines } = req.body;
    req.shop.medicines = medicines;
    await req.shop.save();

    res.json({
      success: true,
      data: req.shop
    });
  } catch (error) {
    console.error('Update medicines error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/medical-shops/:id
// @desc    Update medical shop details
// @access  Private/Admin or Shop Owner
router.put('/:id', protect, checkShopOwnership, [
  body('name').optional().notEmpty().withMessage('Shop name cannot be empty'),
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

    const { name, email, phone, address, openingHours, coordinates } = req.body;
    
    if (name) req.shop.name = name;
    if (email) req.shop.email = email;
    if (phone) req.shop.phone = phone;
    if (address) req.shop.address = address;
    if (openingHours) req.shop.openingHours = openingHours;
    if (coordinates) {
      req.shop.location = {
        type: 'Point',
        coordinates
      };
    }

    await req.shop.save();

    res.json({
      success: true,
      data: req.shop
    });
  } catch (error) {
    console.error('Update shop error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

