
'use strict';
module.exports = (sequelize, DataTypes) => {
  var contributor = sequelize.define('tblcontributors', {
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true, 
        autoIncrement: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true, 
        autoIncrement: false
    }
}, {
    timestamps : false
});

  return contributor;
};

