const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup upload directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Multer config for Banners and Documents
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// Mongoose Schemas & Models
const registrationSchema = new mongoose.Schema({
  applicationId: { type: String, required: true, unique: true },
  role: String,
  companyInfo: { type: mongoose.Schema.Types.Mixed, default: {} },
  businessDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  documents: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, default: 'UNDER_REVIEW' },
  submittedOn: { type: Date, default: Date.now }
}, { strict: false, minimize: false });
const Registration = mongoose.model('Registration', registrationSchema);

const bannerSchema = new mongoose.Schema({
  title: String,
  imageUrl: { type: String, required: true },
  linkUrl: { type: String, default: '#' },
  position: { type: String, default: 'top' },
  adTimer: { type: Number, default: 5 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
const Banner = mongoose.model('Banner', bannerSchema);

const requirementSchema = new mongoose.Schema({
  category: { type: String, required: true },
  interestedUsers: [{ type: String }],
  dealsCompletedUsers: [{ type: String }],
  postedAt: { type: Date, default: Date.now }
}, { strict: false });
const Requirement = mongoose.model('Requirement', requirementSchema);

const activityLogSchema = new mongoose.Schema({
  actionType: { type: String, required: true }, // 'SIGNUP', 'APPROVE', 'POST', 'INTEREST'
  description: { type: String, required: true },
  icon: { type: String, default: 'check' }, // 'check', 'user', 'post', 'alert'
  timestamp: { type: Date, default: Date.now }
});
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

const directoryCompanySchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  contactPerson: String,
  designation: String,
  category: String,
  location: String,
  estYear: String,
  phoneCode: String,
  phone: String,
  mobileCode: String,
  mobile: String,
  email: String,
  website: String,
  address: String,
  businessHours: String,
  products: [String],
  companyLogo: String,
  isVerified: { type: Boolean, default: false },
  status: { type: String, default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});
const DirectoryCompany = mongoose.model('DirectoryCompany', directoryCompanySchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// ==========================================
// 1. Authentication & Onboarding APIs
// ==========================================

app.post('/api/auth/login', async (req, res) => {
  const { emailOrPhone, password } = req.body;
  if (!emailOrPhone || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  try {
    const userRecord = await Registration.findOne({
      $or: [
        { 'companyInfo.email': emailOrPhone },
        { 'companyInfo.mobile': emailOrPhone }
      ]
    });

    if (userRecord) {
      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.token",
          user: {
            id: userRecord._id,
            name: userRecord.companyInfo?.contactName || "User",
            role: userRecord.role,
            companyName: userRecord.companyInfo?.companyName,
            isVerified: userRecord.status === 'APPROVED',
            status: userRecord.status
          }
        }
      });
    }
  } catch (error) {
    console.error("Login DB Error:", error);
  }

  // Fallback dummy
  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.token",
      user: {
        id: "usr_12345",
        name: "Rishi Patel",
        role: "CHEMICAL_MANUFACTURER",
        companyName: "Reliance Industries",
        isVerified: true,
        status: "APPROVED"
      }
    }
  });
});

app.post('/api/auth/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number required' });
  }
  res.status(200).json({ success: true, message: "OTP sent successfully", otp: "123456" });
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { phone, firebaseVerified } = req.body;
  if (!phone || !firebaseVerified) {
    return res.status(400).json({ success: false, message: 'Phone and firebase verification status required' });
  }
  
  if (firebaseVerified) {
    try {
      const phoneSuffix = phone.length > 10 ? phone.slice(-10) : phone;
      const userRecord = await Registration.findOne({
        'companyInfo.mobile': { $regex: new RegExp(phoneSuffix + '$') }
      });

      if (userRecord) {
        return res.status(200).json({
          success: true,
          message: "OTP verified successfully",
          data: {
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.token",
            user: {
              id: userRecord._id,
              name: userRecord.companyInfo?.contactName || "User",
              role: userRecord.role,
              companyName: userRecord.companyInfo?.companyName,
              isVerified: userRecord.status === 'APPROVED',
              status: userRecord.status
            }
          }
        });
      }
    } catch (error) {
      console.error("OTP DB Error:", error);
    }

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.token",
        user: {
          id: "usr_12345",
          name: "Rishi Patel",
          role: "CHEMICAL_MANUFACTURER",
          companyName: "Reliance Industries",
          isVerified: true,
          status: "APPROVED"
        }
      }
    });
  } else {
    res.status(400).json({ success: false, message: 'Invalid Verification' });
  }
});

app.get('/api/profile/me', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    // Try finding the actual registration
    let userRecord;
    try {
      userRecord = await Registration.findById(userId);
    } catch(e) {}

    if (userRecord) {
      return res.status(200).json({
        success: true,
        data: {
          id: userRecord._id,
          applicationId: userRecord.applicationId,
          name: userRecord.companyInfo?.contactName || "User",
          email: userRecord.companyInfo?.email || "",
          mobile: userRecord.companyInfo?.mobile || "",
          role: userRecord.role,
          companyName: userRecord.companyInfo?.companyName || "Unknown",
          location: userRecord.companyInfo?.location || "",
          website: userRecord.companyInfo?.website || "",
          isVerified: userRecord.status === 'APPROVED',
          status: userRecord.status,
          companyInfo: userRecord.companyInfo || {},
          businessDetails: userRecord.businessDetails || {}
        }
      });
    }

    // Dummy fallback
    if (userId === "usr_12345") {
      return res.status(200).json({
        success: true,
        data: {
          id: "usr_12345",
          applicationId: "CNX-APP-12345",
          name: "Rishi Patel",
          email: "rishi@reliance.com",
          mobile: "9876543210",
          role: "CHEMICAL_MANUFACTURER",
          companyName: "Reliance Industries",
          location: "Mumbai, India",
          website: "https://reliance.com",
          isVerified: true,
          status: "APPROVED",
          companyInfo: {
            contactName: "Rishi Patel",
            email: "rishi@reliance.com",
            mobile: "9876543210",
            website: "https://reliance.com",
            location: "Mumbai, India",
            gstNumber: "27AABCU9603R1ZM",
            panNumber: "AABCU9603R",
            about: "Leading chemical manufacturer in India."
          },
          businessDetails: {
            turnover: "100Cr+",
            employees: "500-1000",
            products: ["Methanol", "Ethanol", "Sulfuric Acid"],
            certifications: ["ISO 9001", "GMP"]
          }
        }
      });
    }

    res.status(404).json({ success: false, message: 'Profile not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

app.post('/api/auth/signup', upload.fields([
  { name: 'companyProfile', maxCount: 1 },
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'otherDocs', maxCount: 5 }
]), async (req, res) => {
  
  // LOG EVERYTHING TO HELP DEBUG FLUTTER DATA
  console.log("\n--- INCOMING FLUTTER REQUEST ---");
  console.log("req.body:", req.body);
  console.log("req.files:", req.files ? Object.keys(req.files) : 'None');
  console.log("--------------------------------\n");

  // Map the flattened fields from Flutter into the nested objects expected by the database
  let companyInfo = {
    companyName: req.body.companyName,
    website: req.body.website,
    contactName: req.body.contactName,
    mobile: req.body.mobile,
    email: req.body.email,
    gstNumber: req.body.gstNumber,
    panNumber: req.body.panNumber,
    location: req.body.location,
    about: req.body.about
  };
  
  let businessDetails = {
    turnover: req.body.turnover,
    employees: req.body.employees,
    products: req.body.products,
    certifications: req.body.certifications
  };
  
  // Clean up undefined/empty fields from the mapping
  Object.keys(companyInfo).forEach(key => companyInfo[key] === undefined && delete companyInfo[key]);
  Object.keys(businessDetails).forEach(key => businessDetails[key] === undefined && delete businessDetails[key]);
  
  // Map uploaded files to localhost URLs
  const documents = {};
  if (req.files) {
    if (req.files['companyProfile']) documents.companyProfile = `http://localhost:${PORT}/uploads/${req.files['companyProfile'][0].filename}`;
    if (req.files['gstCertificate']) documents.gstCertificate = `http://localhost:${PORT}/uploads/${req.files['gstCertificate'][0].filename}`;
    if (req.files['panCard']) documents.panCard = `http://localhost:${PORT}/uploads/${req.files['panCard'][0].filename}`;
    if (req.files['otherDocs']) {
       documents.otherDocs = req.files['otherDocs'].map(f => `http://localhost:${PORT}/uploads/${f.filename}`);
    }
  }

  const applicationId = `CNX-APP-${Date.now()}`;
  
  try {
    const newRegistration = await Registration.create({
      applicationId: applicationId,
      role: req.body.role,
      companyInfo: companyInfo || {},
      businessDetails: businessDetails || {},
      documents: documents,
      status: "UNDER_REVIEW"
    });
    
    // Log Activity
    await ActivityLog.create({
      actionType: 'SIGNUP',
      description: `New signup: ${companyInfo.companyName || 'Unknown Company'}`,
      icon: 'user'
    });
    
    console.log("\n=== SAVED TO MONGODB ===");
    console.log(newRegistration);
    console.log("===============================\n");

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: {
        applicationId: newRegistration.applicationId,
        status: newRegistration.status,
        submittedOn: newRegistration.submittedOn,
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.token",
        user: {
          id: newRegistration._id || "usr_" + Date.now(),
          name: companyInfo.contactName || "User",
          role: newRegistration.role,
          companyName: companyInfo.companyName,
          isVerified: false
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Database Error', error: error.message });
  }
});

app.get('/api/auth/status', async (req, res) => {
  try {
    const latestRegistration = await Registration.findOne().sort({ submittedOn: -1 });
    
    if (latestRegistration) {
      res.status(200).json({
        success: true,
        data: {
          status: latestRegistration.status,
          applicationId: latestRegistration.applicationId,
          submittedOn: latestRegistration.submittedOn
        }
      });
    } else {
      res.status(200).json({
        success: true,
        data: {
          status: "UNDER_REVIEW",
          applicationId: "CNX-APP-260602-00123",
          submittedOn: "2026-06-02T12:45:00Z"
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database Error' });
  }
});

// ==========================================
// 1.5. Admin User Management APIs
// ==========================================

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@chemnexus.com' && password === 'admin123') {
    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        token: 'admin_dummy_token_123',
        admin: { email: 'admin@chemnexus.com', role: 'SUPER_ADMIN' }
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await Registration.find().sort({ submittedOn: -1 });
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database Error' });
  }
});

app.post('/api/admin/users/:id/approve', async (req, res) => {
  try {
    const updatedUser = await Registration.findOneAndUpdate(
      { applicationId: req.params.id },
      { status: "APPROVED" },
      { returnDocument: 'after' }
    );
    
    if (updatedUser) {
      // Log Activity
      await ActivityLog.create({
        actionType: 'APPROVE',
        description: `Signup approved: ${updatedUser.companyInfo?.companyName || updatedUser.applicationId}`,
        icon: 'check'
      });

      res.status(200).json({
        success: true,
        message: "User approved successfully",
        data: updatedUser
      });
    } else {
      res.status(404).json({ success: false, message: "User application not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database Error' });
  }
});

app.post('/api/admin/users/:id/reject', async (req, res) => {
  try {
    const updatedUser = await Registration.findOneAndUpdate(
      { applicationId: req.params.id },
      { status: "REJECTED" },
      { returnDocument: 'after' }
    );
    
    if (updatedUser) {
      // Log Activity
      await ActivityLog.create({
        actionType: 'REJECT',
        description: `Application rejected: ${updatedUser.companyInfo?.companyName || updatedUser.applicationId}`,
        icon: 'alert'
      });

      res.status(200).json({
        success: true,
        message: "User rejected successfully",
        data: updatedUser
      });
    } else {
      res.status(404).json({ success: false, message: "User application not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database Error' });
  }
});

// ==========================================
// 2. Banner APIs
// ==========================================
app.get('/api/banners', async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: banners
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database Error', error: error.message });
  }
});

// For Flutter app backward compatibility (although they can just use the DB ones)
app.post('/api/banners/upload', upload.single('bannerImage'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image uploaded' });
  }
  try {
    const newBanner = new Banner({
      title: req.body.title || 'New Banner',
      imageUrl: `http://192.168.1.7:3000/uploads/${req.file.filename}`, // Using generic local IP for dev
      linkUrl: req.body.linkUrl || "#",
      position: req.body.position || "top",
      adTimer: req.body.adTimer ? parseInt(req.body.adTimer, 10) : 5,
      isActive: true
    });
    await newBanner.save();
    res.status(200).json({
      success: true,
      message: 'Banner uploaded successfully',
      data: newBanner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database Error', error: error.message });
  }
});

// Admin APIs for Banners
app.get('/api/admin/banners', async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: banners
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database Error', error: error.message });
  }
});

app.put('/api/admin/banners/:id/status', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    
    banner.isActive = req.body.isActive;
    await banner.save();
    
    res.status(200).json({ success: true, message: 'Banner status updated', data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database Error' });
  }
});

app.delete('/api/admin/banners/:id', async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    res.status(200).json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database Error' });
  }
});

// ==========================================
// 3. Leads & Marketplace APIs
// ==========================================

// Generic requirement post handler
const handleRequirementPost = async (req, res, category) => {
  try {
    const data = { ...req.body, category };
    const newReq = new Requirement(data);
    await newReq.save();
    
    // Log Activity
    const itemName = req.body.productName || req.body.itemName || req.body.equipmentName || 'Requirement';
    await ActivityLog.create({
      actionType: 'POST',
      description: `New post created: ${itemName}`,
      icon: 'post'
    });

    res.status(200).json({ success: true, message: 'Requirement posted successfully', data: newReq });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Database Error', error: error.message });
  }
};

app.post('/api/requirements/logistics/post', (req, res) => handleRequirementPost(req, res, 'Logistics'));
app.post('/api/requirements/lab/post', (req, res) => handleRequirementPost(req, res, 'Lab Chemicals'));
app.post('/api/requirements/oem/post', (req, res) => handleRequirementPost(req, res, 'OEM / EPC'));
app.post('/api/requirements/packaging/post', (req, res) => handleRequirementPost(req, res, 'Packaging Material'));
app.post('/api/requirements/manufacturer/post', (req, res) => handleRequirementPost(req, res, 'Manufacturer / Distributor'));

app.get('/api/requirements', async (req, res) => {
  try {
    const requirements = await Requirement.find().sort({ postedAt: -1 });
    res.status(200).json({
      success: true,
      data: requirements
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database Error', error: error.message });
  }
});

app.post('/api/requirements/:id/interest', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }

    if (!requirement.interestedUsers.includes(userId)) {
      requirement.interestedUsers.push(userId);
      await requirement.save();
    }

    res.status(200).json({
      success: true,
      message: 'Interest recorded successfully',
      data: requirement
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database Error', error: error.message });
  }
});

app.post('/api/requirements/:id/deal', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }

    if (!requirement.dealsCompletedUsers) requirement.dealsCompletedUsers = [];
    
    if (!requirement.dealsCompletedUsers.includes(userId)) {
      requirement.dealsCompletedUsers.push(userId);
      await requirement.save();
    }

    res.status(200).json({
      success: true,
      message: 'Deal recorded successfully',
      data: requirement
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database Error', error: error.message });
  }
});

app.get('/api/active-users', (req, res) => {
  // Mock base active users (admin can change this in DB in future, hardcoded base for now)
  res.status(200).json({
    success: true,
    activeUsers: 1245
  });
});

app.get('/api/inventory/:userId', async (req, res) => {
  try {
    const requirements = await Requirement.find({ interestedUsers: req.params.userId }).sort({ postedAt: -1 });
    res.status(200).json({
      success: true,
      data: requirements
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database Error', error: error.message });
  }
});

app.get('/api/leads', (req, res) => {
  const { search, filter } = req.query;
  
  res.status(200).json({
    success: true,
    data: [
      {
        id: "ld_001",
        badge: {
          text: "VERIFIED LEAD",
          bgColor: "#1B3D2B",
          textColor: "#81C784"
        },
        postedAt: "2026-06-02T10:00:00Z",
        title: "High Purity Methanol",
        companyRole: "Provider",
        companyName: "Global Chem-Sync Ltd.",
        location: "Rotterdam, NL",
        description: "Seeking long-term supply agreement for 500 MT monthly.",
        isVerified: true,
        isOrganic: false
      }
    ]
  });
});

app.post('/api/leads', (req, res) => {
  res.status(201).json({
    success: true,
    message: "Requirement submitted to review!",
    data: {
      leadId: "ld_002",
      status: "PENDING_APPROVAL"
    }
  });
});

app.post('/api/leads/:id/interest', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Expression of Interest sent successfully!"
  });
});

// ==========================================
// 1.6. Live Dashboard APIs
// ==========================================

app.get('/api/admin/live-dashboard', async (req, res) => {
  try {
    // Top Stats
    const totalUsers = await Registration.countDocuments();
    const pendingApprovals = await Registration.countDocuments({ status: 'UNDER_REVIEW' });
    const totalPosts = await Requirement.countDocuments();
    
    // Total Interests (sum of lengths of interestedUsers arrays across all requirements)
    const reqs = await Requirement.find({}, 'interestedUsers');
    const totalInterests = reqs.reduce((acc, curr) => acc + (curr.interestedUsers ? curr.interestedUsers.length : 0), 0);

    // Mocks for features not fully built yet
    const activeSubscriptions = 1450;
    const expiredSubscriptions = 82;
    const contactUnlocks = 15200;
    const revenue = 24000;

    // Charts Data
    const revenueChart = [
      { name: 'Mon', value: 4000 },
      { name: 'Tue', value: 3000 },
      { name: 'Wed', value: 5000 },
      { name: 'Thu', value: 4500 },
      { name: 'Fri', value: 6000 },
      { name: 'Sat', value: 7000 },
      { name: 'Sun', value: 8500 },
    ];
    
    const interestsVsPostsChart = [
      { name: 'Jun', posts: 400, interests: 900 },
      { name: 'Jul', posts: 300, interests: 1300 },
      { name: 'Aug', posts: 200, interests: 1400 },
      { name: 'Sep', posts: 278, interests: 1500 },
      { name: 'Oct', posts: 189, interests: 1800 },
      { name: 'Nov', posts: 239, interests: 2000 },
    ];

    const users = await Registration.find({}, 'role');
    const roleCounts = users.reduce((acc, user) => {
      const role = user.role || 'Unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    
    const userTypeDistribution = Object.keys(roleCounts).map(role => ({
      name: role,
      value: roleCounts[role]
    }));

    // Recent Activity (limit 15)
    const recentActivity = await ActivityLog.find().sort({ timestamp: -1 }).limit(15);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          pendingApprovals,
          activeSubscriptions,
          expiredSubscriptions,
          totalPosts,
          totalInterests,
          contactUnlocks,
          revenue
        },
        charts: {
          revenueChart,
          interestsVsPostsChart,
          userTypeDistribution: userTypeDistribution.length > 0 ? userTypeDistribution : [{name: 'Free', value: 400}, {name: 'Premium', value: 300}]
        },
        recentActivity
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Database Error' });
  }
});

// ==========================================
// 3. Lead & Directory APIs
// ==========================================

app.get('/api/directory', async (req, res) => {
  try {
    const companies = await DirectoryCompany.find().sort({ createdAt: -1 });
    
    // Group by Country/Region
    const groupedData = {};
    
    if (companies.length === 0) {
       // Return empty object if no companies
       return res.status(200).json({ success: true, data: {} });
    }

    companies.forEach(company => {
      // Very basic extraction of country from location
      let region = "Global";
      if (company.location && company.location.includes(',')) {
        const parts = company.location.split(',');
        region = parts[parts.length - 1].trim();
      } else if (company.location) {
        region = company.location.trim();
      }

      if (!groupedData[region]) {
        groupedData[region] = { totalCount: 0, companies: [] };
      }
      
      groupedData[region].totalCount += 1;
      
      groupedData[region].companies.push({
        id: company._id,
        logoText: company.companyLogo ? null : (company.companyName ? company.companyName.charAt(0).toUpperCase() : 'C'),
        logoUrl: company.companyLogo,
        isVerified: company.isVerified,
        title: company.companyName,
        tagline: company.category || "General Provider",
        chips: company.products || [],
        location: company.location || "Unknown",
        status: company.status,
        contactPerson: company.contactPerson,
        designation: company.designation,
        phoneCode: company.phoneCode,
        phone: company.phone,
        mobileCode: company.mobileCode,
        mobile: company.mobile,
        email: company.email,
        website: company.website,
        address: company.address,
        businessHours: company.businessHours,
        estYear: company.estYear,
        category: company.category
      });
    });

    res.status(200).json({
      success: true,
      data: groupedData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Database Error' });
  }
});

app.post('/api/admin/directory', upload.single('companyLogo'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.companyLogo = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    }
    
    // Parse products if sent as a JSON string
    if (data.products && typeof data.products === 'string') {
      try {
        data.products = JSON.parse(data.products);
      } catch (e) {
        // keep as string if parse fails (fallback)
      }
    }

    const newCompany = await DirectoryCompany.create(data);
    
    // Log Activity
    await ActivityLog.create({
      actionType: 'APPROVE',
      description: `New directory added: ${newCompany.companyName}`,
      icon: 'check'
    });

    res.status(201).json({ success: true, message: 'Directory entry created', data: newCompany });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Database Error' });
  }
});

app.post('/api/directory/:id/bookmark', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Company bookmarked successfully!"
  });
});

// ==========================================
// 5. Profile APIs
// ==========================================

app.get('/api/profile/me', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    let user;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await Registration.findById(userId);
    }
    if (!user) {
       user = await Registration.findOne({
          $or: [ { applicationId: userId } ]
       });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const companyInfo = user.companyInfo || {};
    const name = companyInfo.contactName || "User";
    const companyName = companyInfo.companyName || "Unknown Company";

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        applicationId: user.applicationId,
        name: name,
        avatarUrl: null,
        avatarInitial: companyName.charAt(0).toUpperCase(),
        companyName: companyName,
        role: user.role,
        isVerified: user.status === 'APPROVED',
        stats: {
          activeLeads: 14,
          connections: 128,
          profileViews: 840
        },
        companyInfo: user.companyInfo || {},
        businessDetails: user.businessDetails || {}
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/profile/me', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Profile updated successfully."
  });
});

// ==========================================
// 6. Admin Panel APIs
// ==========================================

app.get('/api/admin/stats', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      totalUsers: { value: "12,482", trend: "+4.2%", trendType: "positive" },
      pendingApprovals: { value: "148", trend: "Requires Action", trendType: "warning" },
      activeListings: { value: "3,204", trend: "+12.8%", trendType: "positive" },
      serverLoad: { cpu: "24%", dbStatus: "Healthy" }
    }
  });
});

app.get('/api/admin/activity', (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      { name: 'MON', value: 300 },
      { name: 'TUE', value: 200 },
      { name: 'WED', value: 450 },
      { name: 'THU', value: 380 },
      { name: 'FRI', value: 750, active: true },
      { name: 'SAT', value: 280 },
      { name: 'SUN', value: 200 },
    ]
  });
});

app.get('/api/admin/tasks', (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      {
        id: 1,
        title: "New Vendor Verification",
        description: "GlobalChem Ltd submitted documents for Tier 1 status.",
        priority: "warning"
      },
      {
        id: 2,
        title: "Post Moderation Alert",
        description: "Reported listing #94821: Inaccurate chemical safety data.",
        priority: "danger"
      },
      {
        id: 3,
        title: "System Update Pending",
        description: "Database migration scheduled for 02:00 UTC.",
        priority: "success"
      }
    ]
  });
});

// ==========================================
// 7. Push Notifications / FCM APIs
// ==========================================
app.post('/api/users/fcm-token', express.json(), (req, res) => {
  const { fcmToken } = req.body;
  
  if (!fcmToken) {
    return res.status(400).json({ success: false, message: 'FCM Token is required' });
  }

  // In a real database, you would find the user by ID and update their record:
  // await User.findByIdAndUpdate(req.user.id, { fcmToken: fcmToken });
  
  console.log(`Received FCM Token to save: ${fcmToken}`);
  
  res.status(200).json({
    success: true,
    message: 'FCM Token saved successfully',
    data: { token: fcmToken }
  });
});

// ==========================================
// 8. Policies APIs
// ==========================================

app.get('/api/policies/terms', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      title: "TERMS & CONDITIONS",
      subtitle: "Please read these terms and conditions carefully before using ChemNexus.",
      icon: "file-shield",
      buttonText: "I Agree",
      points: [
        { id: 1, text: "ChemNexus acts only as a facilitator to connect businesses and is not a party to any transaction." },
        { id: 2, text: "ChemNexus is not responsible for any disputes, losses, damages, or fraud arising between users." },
        { id: 3, text: "Users are solely responsible for conducting their own due diligence before entering into any transaction." },
        { id: 4, text: "Basic verification (GST, PAN, etc.) is conducted, but ChemNexus does not guarantee the authenticity or credibility of any user." },
        { id: 5, text: "Users must provide accurate, complete, and truthful information at all times." },
        { id: 6, text: "Any false, misleading, or misrepresented information may lead to suspension or termination of the account." },
        { id: 7, text: "Users are solely responsible for all content they post, including product details, pricing, and claims." },
        { id: 8, text: "ChemNexus reserves the right to remove or modify any content or account without prior notice." },
        { id: 9, text: "Accounts involved in suspicious, fraudulent, or unethical activity may be suspended or permanently banned & no refund shall be provided." },
        { id: 10, text: "ChemNexus does not guarantee deal closures, responses, or business outcomes." }
      ]
    }
  });
});

app.get('/api/policies/privacy', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      title: "PRIVACY POLICY",
      subtitle: "Your privacy is important to us. This Privacy Policy explains how ChemNexus collects, uses, shares, and protects your information.",
      icon: "lock-shield",
      buttonText: "I Understand",
      points: [
        { id: 1, text: "We collect basic business and personal information such as company name, contact details, GST, PAN, and uploaded documents for verification and platform usage." },
        { id: 2, text: "The information provided by users is used to create profiles, enable connections, and improve platform functionality." },
        { id: 3, text: "User data may be used for communication, notifications, and updates related to platform activity and services." },
        { id: 4, text: "We do not sell personal or business data to third parties; however, relevant information may be shared with other users as part of normal platform interactions." },
        { id: 5, text: "Data may be shared with third-party service providers involved in app development, maintenance, analytics, or communication services." },
        { id: 6, text: "We implement reasonable security measures to protect user data but do not guarantee complete protection against unauthorized access or breaches." },
        { id: 7, text: "Users are responsible for maintaining the confidentiality of their account credentials and personal information." }
      ]
    }
  });
});

app.get('/api/policies/advertisement', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      title: "ADVERTISEMENT POLICY",
      subtitle: "Please read this Advertisement Policy carefully to understand how advertisements and promotional content are managed on ChemNexus.",
      icon: "megaphone",
      buttonText: "I Understand & Agree",
      points: [
        { id: 1, title: "Platform Advertising Rights", text: "ChemNexus reserves the right to display advertisements, promotional content, sponsored listings, and marketing communications across the platform, including but not limited to banners, featured posts, notifications, and in-app placements." },
        { id: 2, title: "Free User Exposure", text: "Users on free or non-premium plans may be shown advertisements, sponsored content, or promotional material as part of their platform experience." },
        { id: 3, title: "Premium User Experience", text: "Certain subscription plans may offer reduced or selective exposure to advertisements; however, ChemNexus reserves the right to display essential announcements, platform promotions, or sponsored industry content where deemed relevant." },
        { id: 4, title: "Admin-Controlled Promotions", text: "ChemNexus may create and publish promotional content, including featured listings, flash advertisements, sponsored campaigns, and highlighted posts, at its sole discretion." },
        { id: 5, title: "No Endorsement or Guarantee", text: "The display of any advertisement, sponsored listing, or promotional content does not constitute endorsement, verification, or guarantee by ChemNexus regarding the advertiser, product, or service." }
      ]
    }
  });
});

// Error handling wrapper
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chemnexus';
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB Connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`ChemNexus Backend API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
