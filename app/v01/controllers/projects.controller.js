const config = require('../../config/config');
const models = require("../models");
const _ = require("lodash"); 

// helper function 

function addToArray (obj, key, array){

    let index = array.findIndex(x => x[key] === obj[key])

    if (obj[key]!=null && index == -1){
        array.push(obj); 

    }
}

class Project{
    constructor(option=null){
        if (option){
            if (option.projectId){
                this.projectId = option.projectId;
            }
            this.projectTitle = option.projectTitle || null;

            this.contributors = option.contributors ||  [];
        }
    }

    set setUserId (userId){
        this.userId = userId;
    }

    set setProjectId (projectId){
        this.projectId = projectId;
    }
}

function saveProject(req, res){

    try{

        let userId = req.auth.userId; 

        var project = new Project(req.body);

        // ensure owner is contributor          
        _isProjectOwner(userId, project.projectId).then(respObj => {

            project.setUserId = userId;

            if (respObj.isOwner || respObj.isNewProject){

                models.tblprojects.upsert(project).then(pjct => {

                    getProjectItem(project)
                        .then((projectObj) => {
                            return removeProjectContributors(projectObj);
                        })
                        .then((projectId) => {
                            project.setProjectId = projectId; 
                            let array = project.contributors;
                            return insertProjectContributors(projectId, array);
                        }).then((contributorIdArray) => {
                            res.send(project);
                        })
                        .catch(error => {
                            config.handleError("SaveProject", res, error);
                        });
                        
                }).catch(error => {
                    config.handleError("SaveProject", res, error);
                });
            }else{
                res.send(401, "User is not privileged to modify the project settings.")
            }

            
        }).catch(error => {
            config.handleError("SaveProject", res, error);
        });

    }catch(err){
        config.handleError("SaveProject", res, err)
    }
}

async function _isProjectOwner (userId, projectId) {
    
    return new Promise(
        (resolve, reject) => {
            if (projectId){
                models.tblprojects.findAll({
                    where: {
                        projectId : projectId, 
                        userId : userId
                    }
                }).then(function(response) {

                    let respObj = {
                        "projectId" : projectId,
                        "userId" : userId
                    }
                    
                    if (response.length > 0){
                        respObj["isOwner"] = true; 
                    }else{
                        respObj["isOwner"] = false; 
                    }

                    resolve(respObj); 
    
                    }, function(err) {
                        reject(err);
                });
            }else{
                let respObj = {
                    "isNewProject" : true
                };
                config.logger.info("No projectId provided - new project will be created for the user requesting")
                resolve(respObj); 
                
            }

        }
    );

}

async function _getProjectContributors (projectId) {
    
    return new Promise(
        (resolve, reject) => {
            if (projectId){
                models.tblcontributors.findAll({
                    where: {
                        projectId : projectId
                    }
                }).then(function(response) {
    
                    resolve(response);
    
                    }, function(err) {
                        reject(err);
                });
            }else{
                reject("Please provide projectId")
            }

        }
    );

}

async function getProjectItem (project) {
    
    return new Promise(
        (resolve, reject) => {
            models.tblprojects.findAll({
                where: {
                    projectTitle : project.projectTitle || "", 
                    userId : project.userId || ""
                }
            }).then(function(response) {

                if(response.length > 1){
                    throw "No unique project object could be identified"
                }else if(response.length == 1){
                    resolve(response[0]);
                }else{
                    throw "No unique project object could be identified"
                }

                return null;

                }, function(err) {
                    reject(err);
            });
        }
    );

}

async function removeProjectContributors (projectObj) {

    let projectId = projectObj.projectId; 
    
    return new Promise(
        (resolve, reject) => { 
            models.tblcontributors.destroy({
                where: {
                    projectId: projectId
                }
            }).then(function(response) {
                resolve(projectId);
                }, function(err) {
                reject(err);
            });
        }
    );
}

 function insertProjectContributors (projectId, contributorsArray) {
    
    return new Promise(
        (resolve, reject) => {

            let contributorPairs = [];

            contributorsArray.forEach(contributor => {

                contributorPairs.push({
                    "projectId" : projectId, 
                    "userId" : contributor.userId
                });

            });

            models.tblcontributors.bulkCreate(contributorPairs).then(function(response) {
                resolve(contributorPairs);
                }, function(err) {
                   reject(err);
            });
        }
    );
}

// query.params: 
// aggregates=true
function getProjects(req, res){

    try{

        let userId  = req.auth.userId; 

        let getAgg = req.query.aggregates;

        let isIndividualProjectRequest = false;

        let projectId = req.params.projectId;

        let projectWhereStr = ""; 

        var qryOption = { raw: true, replacements: [userId], type: models.sequelize.QueryTypes.SELECT}; 

        if (projectId && typeof(projectId) != "undefined"){
            projectWhereStr = " where p.projectId = ?";
            qryOption.replacements.push(projectId);
            isIndividualProjectRequest = true; 
        }

        let qryStr = 
        'SELECT \
            p.*, \
            u.userId as contribUserId,\
            u.userName as contribUserName,\
            u.userAvatarPath as contribUserAvatarPath \
        FROM fin71.tblprojects as p \
        left join fin71.tblcontributors as c on p.projectId = c.projectId\
        inner join (select * from fin71.tblcontributors where userId = ? ) as projects on p.projectId = projects.projectId \
        left join fin71.tblusers as u on c.userId = u.userId ' + projectWhereStr + ' \
        order by p.projectId ';

        if (getAgg){
            qryStr = 'SELECT \
                p.*, \
                t.sumTransactionsEur, \
                u.userId as contribUserId,\
                u.userName as contribUserName,\
                u.userAvatarPath as contribUserAvatarPath \
            FROM fin71.tblprojects as p \
            left join fin71.tblcontributors as c on p.projectId = c.projectId\
            inner join (select * from fin71.tblcontributors where userId = ? ) as projects on p.projectId = projects.projectId \
            left join ( \
                SELECT \
                sum(transactionAmt) as sumTransactionsEur, \
                projectId \
                from fin71.tbltransactions \
                where transactionCategory = 1 \
                group by projectId) as t on p.projectId = t.projectId \
            left join fin71.tblusers as u on c.userId = u.userId ' + projectWhereStr + ' \
            order by p.projectId ';
        }

        models.sequelize.query(
            qryStr,
            qryOption
        ).then(projects => {

            if (projects) {

                var result = [];
                
                var nestProjects = function(element) {
                    
                    var project  = {
                        "projectId" : element.projectId, 
                        "projectTitle" : element.projectTitle,
                        "userId" : element.userId,
                        "flagProjectOwner" : element.userId == userId ? true : false,
                        "projectCreatedAt" : element.projectCreatedAt, 
                        "projectIconPath": element.projectIconPath, 
                        "contributors" : []
                    };

                    if (getAgg){
                        project["sumTransactionsEur"] = element.sumTransactionsEur;
                    }

                    var contributor = {
                        "userId" : element.contribUserId, 
                        "userName" : element.contribUserName,
                        "userAvatarPath" : element.contribUserAvatarPath
                    };

                    var projectIndex = -1;

                    for (var i = 0; i<result.length; i++){
                        if (result[i].projectId == element.projectId){
                            projectIndex = i;
                        }
                    }

                    if (projectIndex == -1){

                        if (contributor.userId){
                          project.contributors.push(contributor)  
                        }

                        result.push(project);

                        projectIndex = 0;

                    }else{
                        result[projectIndex].contributors.push(contributor)
                    }

                };
                
                _(projects).forEach(nestProjects);

                if (isIndividualProjectRequest){
                    if (result.length == 1){
                        res.json(result[0]);
                    }else{
                        res.send(500, "Something went wrong with individual-project request, projectId " + projectId);
                    }
                }else{
                    res.json(result);
                }
                
            } else {
                res.send(401, "projects not found");
            }

        }).catch(err => {
            config.handleError("getProjects", res, err)
        });


    }catch(err){
        config.handleError("getProjects", res, err);
    }

}


function getProjectsOld(req, res){

    try{

        let userId = req.auth.userId; 

        models.tblprojects.findAll({
            where: {
                userId: userId
              }
        }).then(function(projects) {
            if (projects) {			
                res.json(projects);
            } else {
                res.send(401, "Projects not found");
            }
        }, function(error) {
                throw error;
            
        }).catch(err => {
            config.handleError("getProjects", res, err)
        });


    }catch(err){
        config.handleError("getProjects", res, err);
    }

}

function deleteProject(req, res){

    let userId  = req.auth.userId; 
    let projectId = req.params.projectId; 

    deleteProjectAction(projectId, userId)
    .then(() => {
        res.json(200)
      })
    .catch(err => {
        config.handleError("deleteProject", res, err)
    });

}

async function deleteProjectAction (projectId, userId) {
    
    return new Promise(
        (resolve, reject) => {

            models.tblprojects.destroy({
                where: {
                    projectId: projectId,
                    userId: userId
                  }
            }).then(function(prjct) {
                if (prjct) {				
                    resolve(prjct);
                } else {
                    reject("Project not found");
                }
                }, function(err) {
                   reject(err);
            });
        }
    );
}

module.exports = { _getProjectContributors, _isProjectOwner, saveProject, getProjects, deleteProject};