const config = require('../../config/config');

function listAvailableCurrencies(req, res){

  try{
    var allCur = [];

    for (var property in config.currencyData) {
      if (config.currencyData.hasOwnProperty(property)) {
          allCur.push(property)
      }
    }
  
    res.json(allCur);
  }catch(err){
    config.handleError("listAvailableCurrencies", res, err)
  }
 

}


function instantConvert(origAmount, origCurrencyInput){

  let origCurrency;

  if (origCurrencyInput){
    origCurrency = origCurrencyInput.toUpperCase();
  }else{
    // default currency = EUR
    origCurrencyInput = "EUR";
  }

  origCurrency = origCurrencyInput.toUpperCase();

  if (origCurrency == "EUR"){
        
    let resultObj = {
      "origAmount" : origAmount, 
      "origCurrency" : origCurrency, 
      "targetCurrency" : "EUR", 
      "targetAmount" : parseFloat(origAmount).toFixed(2)
    }; 
    return resultObj;
  }

  if (config.currencyData[origCurrency]){
    let exchRate = config.currencyData[origCurrency];
    let convertedAmt = origAmount/exchRate;

    let resultObj = {
      "origAmount" : origAmount, 
      "origCurrency" : origCurrency, 
      "targetCurrency" : "EUR", 
      "targetAmount" : convertedAmt.toFixed(2)
    }; 

    return resultObj

  }else{
    return false;
  }

}
// query params
// origAmount : number
// origCurrency : string(3) -> international currency code

function convertAmountToEur(req, res){

  try{

      let origAmount = req.query.origAmount;
      // eg. "GBP"
      let origCurrency = req.query.origCurrency;

      let convertObj = instantConvert(origAmount, origCurrency); 

      if (convertObj){
        res.json(convertObj);
      }else{
        res.send(400, {"msg": "currency not found"})
      }

  }catch(err){
      config.handleError("convertAmountToEur", res, err)
  }
}

module.exports = { convertAmountToEur, listAvailableCurrencies, instantConvert }