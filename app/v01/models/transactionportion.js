
'use strict';
module.exports = (sequelize, DataTypes) => {
  var portion = sequelize.define('tbltransactionportions', {
    transactionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true, 
        autoIncrement: false
    },
    userId: {
        type: DataTypes.TEXT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: false
    },
    factor: {
        type: DataTypes.DECIMAL,
        allowNull: false,
    },
}, {
    timestamps : false
});

  return portion;
};

