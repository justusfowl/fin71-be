class QryStrBuilder{
    constructor(sqlString, options={}){

        if (!sqlString){
            throw Error("Please provide a valid SQL statement!")
        }

        this.sqlString = sqlString;

        this.aggString = options.aggString || ""; 

        let pagination = options.pagination || {}
        let fixedFilters = options.fixedFilters || []; 
        let sortingArray = options.sorting || []; 

        this.sortingStr = ""; 

        this.whereStr = "";
        this.whereParams = []; 

        this.parseFilters(fixedFilters);

        this.handlePagination(pagination); 
        this.handleSorting(sortingArray); 
    }

    handleSorting(sortingArray){
        let str = ""; 

        if (sortingArray.length > 0 ){
            str += " ORDER BY "
        }

        sortingArray.forEach(element => {
            let field = element.field; 
            let dir = element.dir || "ASC";

            str += field; 

            if (dir != "ASC"){
               str += " DESC "
            }
            
        });

        this.sortingStr = str; 
    }

    handlePagination(paginationObj){
        if (paginationObj.top){
            this.top = paginationObj.top; 
        }else{
            this.top = 10; 
        }

        if (paginationObj.skip){
            this.skip = paginationObj.skip; 
        }else{
            this.skip = 10; 
        }
    }

    parseFilters(filterArray){
        
        let str = ""; 
        
        if (filterArray.length > 1){
            str = "(";
        }
         
        filterArray.forEach((arr, i) => {

            
            let rowStr = "("; 
            
            arr.forEach((item, index) => {

                let itemStr = this.parseFilterObj(item);

                // wenn mehr als 1 Item in der row ist dann mit AND verknüpfen

                if (arr.length > 1 && index > 0){
                    rowStr += " AND " + itemStr;
                }else{
                    rowStr += itemStr; 
                }
                
            });

            rowStr += ")";

            if (filterArray.length > 1 && i > 0){
                str += " OR " + rowStr;
            }else{
                str += rowStr; 
            }

        });

        if (filterArray.length > 1){
            str += ")"; 
        }

        if (this.whereStr.length > 0){
            this.whereStr += " AND " + str; 
        }else{
            this.whereStr = str; 
        }
        
    }

    parseFilterObj(item){

        let operator = item.op.toLowerCase(); 
        let itemStr = ""; 

        switch(operator) {
            case "eq":
                itemStr = " " + item.field + "=?";
                this.whereParams.push(item.value1);
                break;
            case "ne":
                if (Array.isArray(item.value1)){
                    itemStr = " " + item.field + " NOT IN ("

                    item.value1.forEach((val, ind) => {
                        itemStr += "?";
                        if (item.value1.length != ind+1 && item.value1.length > 1){
                            itemStr += ",";
                        }

                        this.whereParams.push(val)
                    });

                    itemStr += ")"
                }else{
                    itemStr = " " + item.field + "<>?";
                    this.whereParams.push(item.value1);
                }
                
                break;
            case "gt":
                itemStr = " " + item.field + ">?";
                this.whereParams.push(item.value1);
                break;
            case "lt":
                itemStr = " " + item.field + "<?";
                this.whereParams.push(item.value1);
                break;
            case "ge":
                itemStr = " " + item.field + ">=?";
                this.whereParams.push(item.value1);
                break;
            case "le":
                itemStr = " " + item.field + "<=?";
                this.whereParams.push(item.value1);
                break;
            case "bt":
                itemStr = " " + item.field + ">=?" + " AND " + item.field + "<=?";
                this.whereParams.push(item.value1);
                this.whereParams.push(item.value2);
                break;
            default:
                throw Error("An unknown operator was used");
        }

        return itemStr; 
    }

    get getQryString(){
        let qryStr = ""; 

        if (this.whereStr.length > 0){
            qryStr +=  this.sqlString + " WHERE " + this.whereStr;  
        }else{
            qryStr +=  this.sqlString; 
        }

        if (this.aggString.length > 0){
            qryStr += " " +  this.aggString + " ";   
        }

        if (this.sortingStr.length > 0){
            qryStr += " " +  this.sortingStr + " ";   
        }

        qryStr += " LIMIT " + this.top + " OFFSET " + this.skip;
        
        return qryStr; 
    }

    get whereParams(){
        return this.whereParams; 
    }
}

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

/*
filters = 
	[
	[
		{
			"field" : "expenseDate", 
			"op" : "EQ", 
			"value1" : "2018-02-01 10:00:00", 
			"value2" : null
		},
		{
			"field" : "harald", 
			"op" : "NE", 
			"value1" : ["asd"], 
			"value2" : null
		},
	],
	[
		{
			"field" : "test", 
			"op" : "BT", 
			"value1" : "098", 
			"value2" : null
		},
	],
]; 


ff = 
	[
	[
		{
			"field" : "userId", 
			"op" : "EQ", 
			"value1" : "1", 
			"value2" : null
		}
	]
];

let api = new QryStrBuilder("SELECT * FROM TEST", {
    aggString : "GROUP BY trottel",
    sorting : [{"field" : "harald", "dir" : "DESC"}],
    fixedFilters : ff
 }); 
 
 api.parseFilters(filters); 
 
 let qry = api.getQryString;
 let params = api.getParams;

 */

module.exports = {
    QryStrBuilder, 
    validateEmail
};

