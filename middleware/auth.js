const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'אין הרשאה, נדרש להתחבר' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-accessToken -refreshToken');
    
    if (!user) {
      return res.status(401).json({ message: 'משתמש לא נמצא' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'טוקן לא תקין' });
  }
};

module.exports = auth;
