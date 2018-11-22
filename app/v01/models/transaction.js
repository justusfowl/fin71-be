
'use strict';
module.exports = (sequelize, DataTypes) => {
  var transaction = sequelize.define('tbltransactions', {
    transactionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true, 
        autoIncrement: true
    },
    transactionTitle: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    transactionAmt: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    transactionCur: {
        type: DataTypes.TEXT,
        allowNull: false
    },

    transactionAmtOrig: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    transactionCurOrig: {
        type: DataTypes.TEXT,
        allowNull: false
    },

    transactionCreatedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    typeId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    transactionPayerUserId: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    transactionCreatorUserId: {
        type: DataTypes.TEXT,
        allowNull: false
    },
}, {
    timestamps : false
});

  return transaction;
};

