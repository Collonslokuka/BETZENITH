const { body, param, query, validationResult } = require('express-validator');

// Validation result middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// ============ AUTH VALIDATION ============
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
    .notEmpty().withMessage('Username is required'),
  
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail()
    .notEmpty().withMessage('Email is required'),
  
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number')
    .notEmpty().withMessage('Password is required'),
  
  validate
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail()
    .notEmpty().withMessage('Email is required'),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  validate
];

// ============ MATCH VALIDATION ============
const createMatchValidation = [
  body('league')
    .trim()
    .notEmpty().withMessage('League is required')
    .isLength({ max: 100 }).withMessage('League name too long'),
  
  body('homeTeam.name')
    .trim()
    .notEmpty().withMessage('Home team name is required')
    .isLength({ max: 50 }).withMessage('Team name too long'),
  
  body('homeTeam.abbreviation')
    .trim()
    .isLength({ min: 1, max: 5 }).withMessage('Abbreviation must be 1-5 characters')
    .notEmpty().withMessage('Home team abbreviation is required'),
  
  body('awayTeam.name')
    .trim()
    .notEmpty().withMessage('Away team name is required')
    .isLength({ max: 50 }).withMessage('Team name too long'),
  
  body('awayTeam.abbreviation')
    .trim()
    .isLength({ min: 1, max: 5 }).withMessage('Abbreviation must be 1-5 characters')
    .notEmpty().withMessage('Away team abbreviation is required'),
  
  body('date')
    .isISO8601().withMessage('Invalid date format')
    .toDate()
    .notEmpty().withMessage('Match date is required'),
  
  body('time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Time must be in HH:MM format')
    .notEmpty().withMessage('Match time is required'),
  
  body('status')
    .optional()
    .isIn(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED', 'POSTPONED']).withMessage('Invalid status'),
  
  body('markets')
    .optional()
    .isArray().withMessage('Markets must be an array')
    .custom((markets) => {
      if (markets && markets.length > 0) {
        for (let market of markets) {
          if (!market.name || !market.odds) {
            throw new Error('Each market must have name and odds');
          }
          if (market.odds && (market.odds < 1.01 || market.odds > 1000)) {
            throw new Error('Odds must be between 1.01 and 1000');
          }
        }
      }
      return true;
    }),
  
  validate
];

const updateMatchValidation = [
  param('id')
    .isMongoId().withMessage('Invalid match ID'),
  
  body('status')
    .optional()
    .isIn(['SCHEDULED', 'LIVE', 'HALFTIME', 'FINISHED', 'CANCELLED', 'POSTPONED']).withMessage('Invalid status'),
  
  body('markets.*.odds')
    .optional()
    .isFloat({ min: 1.01, max: 1000 }).withMessage('Odds must be between 1.01 and 1000'),
  
  body('markets.*.isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),
  
  validate
];

const matchIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid match ID'),
  validate
];

// ============ BET VALIDATION ============
const placeBetValidation = [
  body('matchId')
    .isMongoId().withMessage('Invalid match ID')
    .notEmpty().withMessage('Match ID is required'),
  
  body('marketIndex')
    .isInt({ min: 0, max: 50 }).withMessage('Invalid market index')
    .notEmpty().withMessage('Market index is required'),
  
  body('stake')
    .isFloat({ min: 10, max: 1000000 }).withMessage('Stake must be between 10 and 1,000,000')
    .notEmpty().withMessage('Stake is required'),
  
  validate
];

const placeMultiBetValidation = [
  body('selections')
    .isArray({ min: 1, max: 20 }).withMessage('Selections must be an array with 1-20 items'),
  
  body('selections.*.matchId')
    .isMongoId().withMessage('Invalid match ID'),
  
  body('selections.*.marketIndex')
    .isInt({ min: 0, max: 50 }).withMessage('Invalid market index'),
  
  body('stake')
    .isFloat({ min: 10, max: 1000000 }).withMessage('Stake must be between 10 and 1,000,000'),
  
  validate
];

// ============ PAYMENT VALIDATION ============
const depositValidation = [
  body('amount')
    .isFloat({ min: 100, max: 1000000 }).withMessage('Amount must be between 100 and 1,000,000')
    .notEmpty().withMessage('Amount is required'),
  
  body('paymentMethod')
    .optional()
    .isIn(['card', 'bank', 'mpesa', 'airtel', 'paystack']).withMessage('Invalid payment method'),
  
  validate
];

const withdrawValidation = [
  body('amount')
    .isFloat({ min: 100, max: 1000000 }).withMessage('Amount must be between 100 and 1,000,000')
    .notEmpty().withMessage('Amount is required'),
  
  body('paymentMethod')
    .optional()
    .isIn(['bank', 'mpesa', 'airtel']).withMessage('Invalid payment method'),
  
  validate
];

// ============ ADMIN VALIDATION ============
const settleMatchValidation = [
  param('id')
    .isMongoId().withMessage('Invalid match ID'),
  
  body('winner')
    .isIn(['HOME', 'AWAY', 'DRAW']).withMessage('Winner must be HOME, AWAY, or DRAW')
    .notEmpty().withMessage('Winner is required'),
  
  validate
];

const updateUserRoleValidation = [
  param('id')
    .isMongoId().withMessage('Invalid user ID'),
  
  body('role')
    .isIn(['user', 'admin', 'superadmin']).withMessage('Role must be user, admin, or superadmin')
    .notEmpty().withMessage('Role is required'),
  
  validate
];

// ============ QUERY VALIDATION ============
const matchQueryValidation = [
  query('status')
    .optional()
    .isIn(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED', 'ALL']).withMessage('Invalid status filter'),
  
  query('league')
    .optional()
    .isString().withMessage('League must be a string')
    .isLength({ max: 100 }).withMessage('League name too long'),
  
  query('date')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  validate
];

// ============ PROFILE VALIDATION ============
const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('phoneNumber')
    .optional()
    .matches(/^\+?[0-9]{10,15}$/).withMessage('Please provide a valid phone number'),
  
  body('country')
    .optional()
    .isString().withMessage('Country must be a string'),
  
  validate
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number')
    .notEmpty().withMessage('New password is required'),
  
  validate
];

// ============ KYC VALIDATION ============
const kycSubmissionValidation = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required'),
  
  body('dateOfBirth')
    .isISO8601().withMessage('Invalid date format')
    .toDate(),
  
  body('idNumber')
    .notEmpty().withMessage('ID number is required'),
  
  body('idType')
    .isIn(['passport', 'national_id', 'drivers_license']).withMessage('Invalid ID type'),
  
  body('address')
    .notEmpty().withMessage('Address is required'),
  
  validate
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  createMatchValidation,
  updateMatchValidation,
  matchIdValidation,
  matchQueryValidation,
  placeBetValidation,
  placeMultiBetValidation,
  depositValidation,
  withdrawValidation,
  settleMatchValidation,
  updateUserRoleValidation,
  updateProfileValidation,
  changePasswordValidation,
  kycSubmissionValidation
};