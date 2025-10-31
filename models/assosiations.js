module.exports = db => {
    const { Student, Admin, Quiz, Assignment, Submission, Session, Attendance, Registration, Feed,Topic, Material } = db;

    console.log("Setting up associations...");
    // ---------------- Student----------------

    // Student - Admin
    Student.belongsTo(Admin, { foreignKey: 'assistantId' }); // Assuming Student.adminId refers to Admin
    Admin.hasMany(Student, { foreignKey: 'assistantId' });

    // Student - Submission
    Student.hasMany(Submission, { foreignKey: 'studentId' }); // Submission.student refers to Student.studentId
    Submission.belongsTo(Student, { foreignKey: 'studentId' });

    // Student - Attendance
    Student.hasMany(Attendance, { foreignKey: 'studentId' });
    Attendance.belongsTo(Student, { foreignKey: 'studentId' });

    // // Student - Registrations
    // Student.hasOne(Registration, { foreignKey: 'userId' }); // Registrations.userId refers to Student.studentId
    // Registration.belongsTo(Student, { foreignKey: 'userId' });


    //--------------------Admin---------------------

    // Admin - Feed
    Admin.hasMany(Feed, { foreignKey: 'adminId' });
    Feed.belongsTo(Admin, { foreignKey: 'adminId' });

    // // Admin - Registration
    // Admin.hasMany(Registration, { foreignKey: 'adminId' }); 
    // Registration.belongsTo(Admin, { foreignKey: 'adminId' });

    // Admin - Session     
    Admin.hasMany(Session, { foreignKey: 'adminId' }); 
    Session.belongsTo(Admin, { foreignKey: 'adminId' });

    // Admin - Quiz
    Admin.hasMany(Quiz, { foreignKey: 'publisher' }); 
    Quiz.belongsTo(Admin, { foreignKey: 'publisher' });

    // Admin - Assignment
    Admin.hasMany(Assignment, { foreignKey: 'publisher' }); 
    Assignment.belongsTo(Admin, { foreignKey: 'publisher' });

    // Admin - Submission
    Admin.hasMany(Submission, { foreignKey: 'adminId' }); 
    Submission.belongsTo(Admin, { foreignKey: 'adminId' });

    Admin.hasMany(Topic, { foreignKey: 'publisher' });
    Topic.belongsTo(Admin, { foreignKey: 'publisher' });

    Admin.hasMany(Material, { foreignKey: 'publisher' });
    Material.belongsTo(Admin, { foreignKey: 'publisher' });

    //----------------Topic ------------------------------
    Topic.hasMany(Material, { foreignKey: 'topicId' });
    Material.belongsTo(Topic, { foreignKey: 'topicId' });

    Topic.hasMany(Quiz, { foreignKey: 'topicId' });
    Quiz.belongsTo(Topic, { foreignKey: 'topicId' });

    Topic.hasMany(Assignment, { foreignKey: 'topicId' });
    Assignment.belongsTo(Topic, { foreignKey: 'topicId' });


    // ---------------- Quiz - Submission ----------------
    Quiz.hasMany(Submission, { foreignKey: 'QuizId' }); // Submission.QuizId refers to Quiz.quizId
    Submission.belongsTo(Quiz, { foreignKey: 'QuizId' });


    // ---------------- Assignment - Submission ----------------
    Assignment.hasMany(Submission, { foreignKey: 'asslId' }); // Submission.assId refers to Assignment.asslId
    Submission.belongsTo(Assignment, { foreignKey: 'assId' });


    // ---------------- Session - Attendance ----------------
    Session.hasMany(Attendance, { foreignKey: 'sessionId' });
    Attendance.belongsTo(Session, { foreignKey: 'sessionId' });

    
    console.log("✅ All associations have been set up successfully!");
};