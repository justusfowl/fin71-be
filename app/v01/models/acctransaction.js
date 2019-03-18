
'use strict';
module.exports = (sequelize, DataTypes) => {
  var transaction = sequelize.define('tblacctransactions', {
    accountNumber: {
        type: DataTypes.TEXT,
        allowNull: false,
        primaryKey: true, 
        autoIncrement: false
    },
    accountBlz: {
        type: DataTypes.TEXT,
        allowNull: false,
        primaryKey: true, 
        autoIncrement: false
    },
    transactionAmt: {
        type: DataTypes.DECIMAL,
        allowNull: false,
        primaryKey: true, 
        autoIncrement: false
    },
    transactionTitle: {
        type: DataTypes.TEXT,
        allowNull: false,
        primaryKey: true, 
        autoIncrement: false
    },
    transactionDate: {
        type: DataTypes.DATE,
        allowNull: true, 
        primaryKey: true,
        autoIncrement: false
    },
    transactionCur: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    transactionApplicantName: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    transactionType: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    transactionEntryDate: {
        type: DataTypes.DECIMAL,
        allowNull: true
    },
    withdrawDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    transactionOwnerId: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    linkTransactionId : {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    flagUnread : {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    timestamps : false
});

  return transaction;
};

