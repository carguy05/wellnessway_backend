const MedicalShop = require('../models/MedicalShop');
const Hospital = require('../models/Hospital');

// Check if user owns the medical shop
exports.checkShopOwnership = async (req, res, next) => {
  try {
    const shop = await MedicalShop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Medical shop not found'
      });
    }

    // Check if user is admin or owns the shop
    if (req.user.role === 'admin' || (shop.ownerId && shop.ownerId.toString() === req.user.id)) {
      req.shop = shop;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this medical shop'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Check if user owns the hospital
exports.checkHospitalOwnership = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    // Check if user is admin or owns the hospital
    if (req.user.role === 'admin' || (hospital.ownerId && hospital.ownerId.toString() === req.user.id)) {
      req.hospital = hospital;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this hospital'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Check if user is a shop owner
exports.isShopOwner = (req, res, next) => {
  if (req.user.role === 'medical_shop_owner' || req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Medical shop owner role required.'
  });
};

// Check if user is a hospital owner
exports.isHospitalOwner = (req, res, next) => {
  if (req.user.role === 'hospital_owner' || req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Hospital owner role required.'
  });
};

