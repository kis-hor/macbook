const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  name:{
    type: String,
    required: [true, "Please enter your name!"],
  },
  email:{
    type: String,
    required: [true, "Please enter your email!"],
  },
  password:{
    type: String,
    required: [true, "Please enter your password"],
    minLength: [4, "Password should be greater than 4 characters"],
    select: false,
  },
  number:{
    type: Number,
    required: [true, "Please enter your number!"],
  },
  phoneNumber:{
    type: Number,
  },
  addresses:[
    {
      country: {
        type: String,
      },
      city:{
        type: String,
      },
      address1:{
        type: String,
      },
      address2:{
        type: String,
      },
      zipCode:{
        type: Number,
      },
      addressType:{
        type: String,
      },
    }
  ],
  role:{
    type: String,
    default: "user",
  },
  avatar:{
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
 },
 createdAt:{
  type: Date,
  default: Date.now(),
 },
 resetPasswordToken: String,
 resetPasswordTime: Date,
});


//  Hash password
userSchema.pre("save", async function (next){
  if(!this.isModified("password")){
    next();
  }

  this.password = await bcrypt.hash(this.password, 10);
});

// jwt token
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id}, process.env.JWT_SECRET_KEY,{
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate password reset token using bcrypt
userSchema.methods.getResetPasswordToken = function () {
  // Generate a random token
  const resetToken = Math.random().toString(36).slice(2) + 
                    Date.now().toString(36) + 
                    Math.random().toString(36).slice(2);

  // Hash the token and set to resetPasswordToken field
  const salt = bcrypt.genSaltSync(10);
  this.resetPasswordToken = bcrypt.hashSync(resetToken, salt);
  
  // Set expire time to 15 minutes
  this.resetPasswordTime = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

// Compare reset token
userSchema.methods.compareResetToken = async function (token) {
  return await bcrypt.compare(token, this.resetPasswordToken);
};

module.exports = mongoose.model("User", userSchema);
