const express = require('express');
const router = express.Router();

// Chatbot functionality removed. Keep a harmless route to indicate removal.
router.all('*', (req, res) => {
  res.status(410).json({ success: false, message: 'Chatbot feature has been removed' });
});

module.exports = router;

