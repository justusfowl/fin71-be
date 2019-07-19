
'use strict';
module.exports = (sequelize, DataTypes) => {
  var user = sequelize.define('tblusers', {
    userId: {
        type: DataTypes.TEXT,
        allowNull: false,
        primaryKey: true, 
        autoIncrement: true
    },
    userName: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    userEmail: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    userAvatarPath: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    userCreatedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    localUserCreatedByUserId: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    flagHasAccounts: {
        type: DataTypes.TINYINT,
        allowNull: true
    }
}, {
    timestamps : false
});

  return user;
};

