const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }

  // Validation errors
  if (err.isJoi) {
    return res.status(400).json({ message: err.message });
  }

  // Default error
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
};

module.exports = errorHandler;