import util from 'util';
const debuglog = util.debuglog('ib-tws-api');

import IncomeMessageType from '../const-income-message-type.js';
import ServerVersion from '../const-server-version.js';
import {
  handler_MARKET_DATA_TYPE,
  handler_TICK_BY_TICK,
  handler_TICK_GENERIC,
  handler_TICK_PRICE,
  handler_TICK_REQ_PARAMS,
  handler_TICK_OPTION_COMPUTATION,
  handler_TICK_SIZE,
  handler_TICK_SNAPSHOT_END,
  handler_TICK_STRING
} from './market-data.js';

import {
  handler_OPEN_ORDER,
  handler_COMPLETED_ORDER
} from './order.js';



//
// helper functions
//

function todo(name) {
  return function (fields) {
    console.log(name + ' message handler is not implemented yet');
    console.log(fields);
  };
}



//
// handlers of specific message types.
// called in a context of IncomeFieldsetHandlerBus
//

export default {
  [IncomeMessageType.TICK_PRICE]: function (fields) {
    this.emit('TICK_PRICE', fields);
    handler_TICK_PRICE.bind(this)(fields);
  },

  [IncomeMessageType.TICK_SIZE]: function (fields) {
    this.emit('TICK_SIZE', fields);
    handler_TICK_SIZE.bind(this)(fields);
  },

  [IncomeMessageType.ORDER_STATUS]: function (fields) {
    this.emit('ORDER_STATUS', fields);

    fields.shift();
    let orderId = parseInt(fields.shift());
    let status = fields.shift();

    let filled = parseFloat(fields.shift());
    let remaining = parseFloat(fields.shift());
    let avgFillPrice = parseFloat(fields.shift());

    let permId = parseInt(fields.shift());   // ver 2 field
    let parentId = parseInt(fields.shift());   // ver 3 field
    let lastFillPrice = parseFloat(fields.shift());   // ver 4 field
    let clientId = parseInt(fields.shift());   // ver 5 field
    let whyHeld = fields.shift();   // ver 6 field

    let marketCapPrice = null;
    if (this.serverVersion >= ServerVersion.MIN_SERVER_VER_MARKET_CAP_PRICE) {
      marketCapPrice = parseFloat(fields.shift());
    }

    let orderStatus = {
      orderId: orderId,
      status: status,
      filled: filled,
      remaining: remaining,
      avgFillPrice: avgFillPrice,
      permId: permId,
      parentId: parentId,
      lastFillPrice: lastFillPrice,
      clientId: clientId,
      whyHeld: whyHeld,
      marketCapPrice: marketCapPrice
    }
    this.emit('orderStatus', orderStatus);

    if (status == 'Filled') {
      this.emit('orderFilled', orderStatus);
    }

  },

  [IncomeMessageType.ERR_MSG]: function (fields) {
    this.emit('ERR_MSG', fields);
    let requestId = fields[2];

    if (requestId > 0) {
      this.requestIdEmit(requestId, 'error', {
        code: fields[3],
        message: fields[4]
      });
    } else {
      this.emit('error', {
        code: fields[3],
        message: fields[4]
      });
    }
  },

  [IncomeMessageType.OPEN_ORDER]: function (fields) {
    this.emit('OPEN_ORDER', fields);
    handler_OPEN_ORDER.bind(this)(fields);
  },

  // HandleInfo(wrap=EWrapper.updateAccountValue),
  [IncomeMessageType.ACCT_VALUE]: function (fields) {
    this.emit('ACCT_VALUE', fields);
  },
  // HandleInfo(proc=processPortfolioValueMsg),
  [IncomeMessageType.PORTFOLIO_VALUE]: function (fields) {
    this.emit('PORTFOLIO_VALUE', fields);
  },
  // HandleInfo(wrap=EWrapper.updateAccountTime),
  [IncomeMessageType.ACCT_UPDATE_TIME]: function (fields) {
    this.emit('ACCT_UPDATE_TIME', fields);
  },



  [IncomeMessageType.NEXT_VALID_ID]: function (fields) {
    this.emit('NEXT_VALID_ID', fields);
    this.messageTypeResolve(IncomeMessageType.NEXT_VALID_ID, parseInt(fields[2]));
  },



  [IncomeMessageType.CONTRACT_DATA]: function (fields) {
    this.emit('CONTRACT_DATA', fields);
    fields.shift();
    let version = parseInt(fields.shift());

    let requestId = -1;
    if (version >= 3) {
      requestId = parseInt(fields.shift());
    }

    let contract = {
      contract: {}
    };

    contract.contract.symbol = fields.shift();
    contract.contract.secType = fields.shift();

    let lastTradeDateOrContractMonth = fields.shift();
    if (lastTradeDateOrContractMonth.length > 0) {
      let splitted = lastTradeDateOrContractMonth.split(' ');
      if (splitted.length > 0) {
        contract.contract.lastTradeDateOrContractMonth = splitted[0];
      }

      if (splitted.length > 1) {
        contract.lastTradeTime = splitted[1];
      }
    }

    contract.contract.strike = parseFloat(fields.shift());
    contract.contract.right = fields.shift();
    contract.contract.exchange = fields.shift();
    contract.contract.currency = fields.shift();
    contract.contract.localSymbol = fields.shift();
    contract.marketName = fields.shift();
    contract.contract.tradingClass = fields.shift();
    contract.contract.conId = parseInt(fields.shift());
    contract.minTick = parseFloat(fields.shift());
    if (this.serverVersion >= ServerVersion.MIN_SERVER_VER_MD_SIZE_MULTIPLIER) {
      contract.mdSizeMultiplier = parseInt(fields.shift());
    }
    contract.contract.multiplier = fields.shift();
    contract.orderTypes = fields.shift();
    contract.validExchanges = fields.shift();
    contract.priceMagnifier = parseInt(fields.shift());   // ver 2 field
    if (version >= 4) {
      contract.underConId = parseInt(fields.shift());
    }
    if (version >= 5) {
      contract.longName = fields.shift();
      contract.contract.primaryExchange = fields.shift();
    }
    if (version >= 6) {
      contract.contractMonth = fields.shift();
      contract.industry = fields.shift();
      contract.category = fields.shift();
      contract.subcategory = fields.shift();
      contract.timeZoneId = fields.shift();
      contract.tradingHours = fields.shift();
      contract.liquidHours = fields.shift();
    }
    if (version >= 8) {
      contract.evRule = fields.shift();
      contract.evMultiplier = parseInt(fields.shift());
    }
    if (version >= 7) {
      let secIdListCount = parseInt(fields.shift());
      if (secIdListCount > 0) {
        contract.secIdList = [];
        for (let n = 0; n < secIdListCount; n++) {
          let tagValue = {};
          tagValue.tag = fields.shift();
          tagValue.value = fields.shift();
          contract.secIdList.push(tagValue);
        }
      }
    }

    if (this.serverVersion >= ServerVersion.MIN_SERVER_VER_AGG_GROUP) {
      contract.aggGroup = parseInt(fields.shift());
    }

    if (this.serverVersion >= ServerVersion.MIN_SERVER_VER_UNDERLYING_INFO) {
      contract.underSymbol = fields.shift();
      contract.underSecType = fields.shift();
    }

    if (this.serverVersion >= ServerVersion.MIN_SERVER_VER_MARKET_RULES) {
      contract.marketRuleIds = fields.shift();
    }

    if (this.serverVersion >= ServerVersion.MIN_SERVER_VER_REAL_EXPIRATION_DATE) {
      contract.realExpirationDate = fields.shift();
    }

    let storage = this.requestIdStorageArray(requestId);
    storage.push(contract);
  },

  // HandleInfo(proc=processExecutionDataMsg),
  [IncomeMessageType.EXECUTION_DATA]: function (fields) {
    this.emit('EXECUTION_DATA', fields);

    let version = fields.shift();
    let reqId = fields.shift();
    let orderId = fields.shift();
    let conId = fields.shift();

    let symbol = fields.shift();
    let secType = fields.shift();

    fields.shift();
    fields.shift();
    fields.shift();
    fields.shift();
    fields.shift();

    let currency = fields.shift();

    fields.shift();
    fields.shift();
    fields.shift();

    let datetime = fields.shift();

    fields.shift();
    fields.shift();

    let action = fields.shift();
    let filled = parseFloat(fields.shift());
    let fillPrice = parseFloat(fields.shift());

    this.emit('executionData', {
      version,
      reqId,
      orderId,
      conId,
      symbol,
      secType,
      currency,
      datetime,
      action,
      filled,
      fillPrice,
    })
  },
  
  // HandleInfo(wrap=EWrapper.updateMktDepth),
  [IncomeMessageType.MARKET_DEPTH]: function (fields) {
    this.emit('MARKET_DEPTH', fields);
  },
  // HandleInfo(proc=processMarketDepthL2Msg),
  [IncomeMessageType.MARKET_DEPTH_L2]: function (fields) {
    this.emit('MARKET_DEPTH_L2', fields);
  },
  // HandleInfo(wrap=EWrapper.updateNewsBulletin),
  [IncomeMessageType.NEWS_BULLETINS]: function (fields) {
    this.emit('NEWS_BULLETINS', fields);
  },



  [IncomeMessageType.MANAGED_ACCTS]: function (fields) {
    this.emit('MANAGED_ACCTS', fields);
    this.messageTypeResolve(IncomeMessageType.MANAGED_ACCTS, fields[2].split(','));
  },



  // HandleInfo(wrap=EWrapper.receiveFA),
  [IncomeMessageType.RECEIVE_FA]: function (fields) {
    this.emit('RECEIVE_FA', fields);
  },



  [IncomeMessageType.HISTORICAL_DATA]: function (fields) {
    this.emit('HISTORICAL_DATA', fields);
    fields.shift();

    if (this.serverVersion < ServerVersion.MIN_SERVER_VER_SYNT_REALTIME_BARS) {
      parseInt(fields.shift());
    }

    let requestId = parseInt(fields.shift());
    let startDateStr = fields.shift();   // ver 2 field
    let endDateStr = fields.shift();   // ver 2 field

    let itemCount = parseInt(fields.shift());
    let bars = [];

    for (let n = 0; n < itemCount; n++) {
      let bar = {
        date: fields.shift(),
        open: parseFloat(fields.shift()),
        high: parseFloat(fields.shift()),
        low: parseFloat(fields.shift()),
        close: parseFloat(fields.shift()),
        volume: parseInt(fields.shift()),
        average: parseFloat(fields.shift())
      };

      if (this.serverVersion < ServerVersion.MIN_SERVER_VER_SYNT_REALTIME_BARS) {
        fields.shift();
      }

      bar.barCount = parseInt(fields.shift());   // ver 3 field
      bars.push(bar);
    }

    this.requestIdResolve(requestId, {
      dateStart: startDateStr,
      dateEnd: endDateStr,
      bars: bars
    });
  },



  [IncomeMessageType.HISTORICAL_DATA_UPDATE]: function (fields) {
    this.emit('HISTORICAL_DATA_UPDATE', fields);
    fields.shift();
    let requestId = parseInt(fields.shift());
    let bar = {
      barCount: parseInt(fields.shift()),
      date: fields.shift(),
      open: parseFloat(fields.shift()),
      close: parseFloat(fields.shift()),
      high: parseFloat(fields.shift()),
      low: parseFloat(fields.shift()),
      average: parseFloat(fields.shift()),
      volume: parseInt(fields.shift())
    };

    this.requestIdResolve(requestId, bar);
  },



  // HandleInfo(proc=processBondContractDataMsg),
  [IncomeMessageType.BOND_CONTRACT_DATA]: function (fields) {
    this.emit('BOND_CONTRACT_DATA', fields);
  },



  // HandleInfo(wrap=EWrapper.scannerParameters),
  [IncomeMessageType.SCANNER_PARAMETERS]: function (fields) {
    this.emit('SCANNER_PARAMETERS', fields);
    this.messageTypeResolve(IncomeMessageType.SCANNER_PARAMETERS, fields[2]);
  },



  [IncomeMessageType.SCANNER_DATA]: function (fields) {
    this.emit('SCANNER_DATA', fields);
    fields.shift();
    fields.shift();
    let requestId = parseInt(fields.shift());
    let numberOfElements = parseInt(fields.shift());
    let items = [];

    for (let n = 0; n < numberOfElements; n++) {
      let item = {
        contractDetails: {
          contract: {}
        },
        rank: parseInt(fields.shift())
      };

      item.contractDetails.contract.conId = parseInt(fields.shift());   // ver 3 field
      item.contractDetails.contract.symbol = fields.shift();
      item.contractDetails.contract.secType = fields.shift();
      item.contractDetails.contract.lastTradeDateOrContractMonth = fields.shift();
      item.contractDetails.contract.strike = parseFloat(fields.shift());
      item.contractDetails.contract.right = fields.shift();
      item.contractDetails.contract.exchange = fields.shift();
      item.contractDetails.contract.currency = fields.shift();
      item.contractDetails.contract.localSymbol = fields.shift();
      item.contractDetails.marketName = fields.shift();
      item.contractDetails.contract.tradingClass = fields.shift();
      item.distance = fields.shift();
      item.benchmark = fields.shift();
      item.projection = fields.shift();
      item.legsStr = fields.shift();
      items.push(item);
    }

    this.requestIdEmit(requestId, 'tick', items);
  },



  // HandleInfo(proc=processTickOptionComputationMsg
  [IncomeMessageType.TICK_OPTION_COMPUTATION]: function (fields) {
    this.emit('TICK_OPTION_COMPUTATION', fields);
    handler_TICK_OPTION_COMPUTATION.bind(this)(fields);
  },
  [IncomeMessageType.TICK_GENERIC]: function (fields) {
    this.emit('TICK_GENERIC', fields);
    handler_TICK_GENERIC.bind(this)(fields);
  },
  [IncomeMessageType.TICK_STRING]: function (fields) {
    this.emit('TICK_STRING', fields);
    handler_TICK_STRING.bind(this)(fields);
  },



  // HandleInfo(wrap=EWrapper.tickEFP)
  [IncomeMessageType.TICK_EFP]: function (fields) {
    this.emit('TICK_EFP', fields);
  },



  [IncomeMessageType.CURRENT_TIME]: function (fields) {
    this.emit('CURRENT_TIME', fields);
    this.messageTypeResolve(IncomeMessageType.CURRENT_TIME, parseInt(fields[2]));
  },



  [IncomeMessageType.REAL_TIME_BARS]: function (fields) {
    this.emit('REAL_TIME_BARS', fields);
    fields.shift();
    parseInt(fields.shift());
    let requestId = parseInt(fields.shift());

    let bar = {
      time: parseInt(fields.shift()),
      open: parseFloat(fields.shift()),
      high: parseFloat(fields.shift()),
      low: parseFloat(fields.shift()),
      close: parseFloat(fields.shift()),
      volume: parseInt(fields.shift()),
      wap: parseFloat(fields.shift()),
      count: parseInt(fields.shift())
    };

    this.requestIdResolve(requestId, bar);
  },



  // HandleInfo(wrap=EWrapper.fundamentalData),
  [IncomeMessageType.FUNDAMENTAL_DATA]: function (fields) {
    this.emit('FUNDAMENTAL_DATA', fields);
  },



  [IncomeMessageType.CONTRACT_DATA_END]: function (fields) {
    this.emit('CONTRACT_DATA_END', fields);
    this.requestIdResolve(fields[2], this.requestIdStorageArray(fields[2]));
  },



  [IncomeMessageType.OPEN_ORDER_END]: function (fields) {
    this.emit('OPEN_ORDER_END', fields);
    this.messageTypeResolve(IncomeMessageType.OPEN_ORDER_END,
      this.messageTypeStorageArray(IncomeMessageType.OPEN_ORDER_END));
  },



  // HandleInfo(wrap=EWrapper.accountDownloadEnd),
  [IncomeMessageType.ACCT_DOWNLOAD_END]: function (fields) {
    this.emit('ACCT_DOWNLOAD_END', fields);
  },
  // HandleInfo(wrap=EWrapper.execDetailsEnd),
  [IncomeMessageType.EXECUTION_DATA_END]: function (fields) {
    this.emit('EXECUTION_DATA_END', fields);
  },
  // HandleInfo(proc=processDeltaNeutralValidationMsg),
  [IncomeMessageType.DELTA_NEUTRAL_VALIDATION]: function (fields) {
    this.emit('DELTA_NEUTRAL_VALIDATION', fields);
  },



  [IncomeMessageType.TICK_SNAPSHOT_END]: function (fields) {
    this.emit('TICK_SNAPSHOT_END', fields);
    handler_TICK_SNAPSHOT_END.bind(this)(fields);
  },
  [IncomeMessageType.MARKET_DATA_TYPE]: function (fields) {
    this.emit('MARKET_DATA_TYPE', fields);
    handler_MARKET_DATA_TYPE.bind(this)(fields);
  },



  // HandleInfo(proc=processCommissionReportMsg),
  [IncomeMessageType.COMMISSION_REPORT]: function (fields) {
    this.emit('COMMISSION_REPORT', fields);
  },



  [IncomeMessageType.POSITION_DATA]: function (fields) {
    this.emit('POSITION_DATA', fields);
    fields.shift();
    let version = parseInt(fields.shift());

    let account = fields.shift();

    // decode contract fields
    let contract = {
      conId: parseInt(fields.shift()),
      symbol: fields.shift(),
      secType: fields.shift(),
      lastTradeDateOrContractMonth: fields.shift(),
      strike: parseFloat(fields.shift()),
      right: fields.shift(),
      multiplier: fields.shift(),
      exchange: fields.shift(),
      currency: fields.shift(),
      localSymbol: fields.shift()
    };

    if (version >= 2) {
      contract.tradingClass = fields.shift();
    }

    let position;
    if (this.serverVersion >= ServerVersion.MIN_SERVER_VER_FRACTIONAL_POSITIONS) {
      position = parseFloat(fields.shift());
    } else {
      position = parseInt(fields.shift());
    }

    let avgCost = 0;
    if (version >= 3) {
      avgCost = parseFloat(fields.shift());
    }

    let storage = this.messageTypeStorageMap(IncomeMessageType.POSITION_END);
    storage[contract.conId] = {
      contract: contract,
      position: position,
      avgCost: avgCost
    };
  },



  [IncomeMessageType.POSITION_END]: function (fields) {
    this.emit('POSITION_END', fields);
    this.messageTypeResolve(IncomeMessageType.POSITION_END,
      this.messageTypeStorageMap(IncomeMessageType.POSITION_END));
  },



  // HandleInfo(wrap=EWrapper.accountSummary),
  [IncomeMessageType.ACCOUNT_SUMMARY]: function (fields) {
    this.emit('ACCOUNT_SUMMARY', fields);
  },
  // HandleInfo(wrap=EWrapper.accountSummaryEnd),
  [IncomeMessageType.ACCOUNT_SUMMARY_END]: function (fields) {
    this.emit('ACCOUNT_SUMMARY_END', fields);
  },
  // HandleInfo(wrap=EWrapper.verifyMessageAPI),
  [IncomeMessageType.VERIFY_MESSAGE_API]: function (fields) {
    this.emit('VERIFY_MESSAGE_API', fields);
  },
  // HandleInfo(wrap=EWrapper.verifyCompleted),
  [IncomeMessageType.VERIFY_COMPLETED]: function (fields) {
    this.emit('VERIFY_COMPLETED', fields);
  },
  // HandleInfo(wrap=EWrapper.displayGroupList),
  [IncomeMessageType.DISPLAY_GROUP_LIST]: function (fields) {
    this.emit('DISPLAY_GROUP_LIST', fields);
  },
  // HandleInfo(wrap=EWrapper.displayGroupUpdated),
  [IncomeMessageType.DISPLAY_GROUP_UPDATED]: function (fields) {
    this.emit('DISPLAY_GROUP_UPDATED', fields);
  },
  // HandleInfo(wrap=EWrapper.verifyAndAuthMessageAPI),
  [IncomeMessageType.VERIFY_AND_AUTH_MESSAGE_API]: function (fields) {
    this.emit('VERIFY_AND_AUTH_MESSAGE_API', fields);
  },
  // HandleInfo(wrap=EWrapper.verifyAndAuthCompleted),
  [IncomeMessageType.VERIFY_AND_AUTH_COMPLETED]: function (fields) {
    this.emit('VERIFY_AND_AUTH_COMPLETED', fields);
  },
  // HandleInfo(proc=processPositionMultiMsg),
  [IncomeMessageType.POSITION_MULTI]: function (fields) {
    this.emit('POSITION_MULTI', fields);
  },
  // HandleInfo(wrap=EWrapper.positionMultiEnd),
  [IncomeMessageType.POSITION_MULTI_END]: function (fields) {
    this.emit('POSITION_MULTI_END', fields);
  },
  // HandleInfo(wrap=EWrapper.accountUpdateMulti),
  [IncomeMessageType.ACCOUNT_UPDATE_MULTI]: function (fields) {
    this.emit('ACCOUNT_UPDATE_MULTI', fields);
  },
  // HandleInfo(wrap=EWrapper.accountUpdateMultiEnd),
  [IncomeMessageType.ACCOUNT_UPDATE_MULTI_END]: function (fields) {
    this.emit('ACCOUNT_UPDATE_MULTI_END', fields);
  },



  [IncomeMessageType.SECURITY_DEFINITION_OPTION_PARAMETER]: function (fields) {
    this.emit('SECURITY_DEFINITION_OPTION_PARAMETER', fields);
    fields.shift();

    let requestId = parseInt(fields.shift());
    let exchange = fields.shift();
    let underlyingConId = parseInt(fields.shift());
    let tradingClass = fields.shift();
    let multiplier = fields.shift();

    let expCount = parseInt(fields.shift());
    let expirations = [];

    for (let n = 0; n < expCount; n++) {
      expirations.push(fields.shift());
    }

    let strikeCount = parseInt(fields.shift());
    let strikes = [];
    for (let n = 0; n < strikeCount; n++) {
      strikes.push(parseFloat(fields.shift()));
    }

    let storage = this.requestIdStorageArray(requestId);
    storage.push({
      exchange: exchange,
      underlyingConId: underlyingConId,
      tradingClass: tradingClass,
      multiplier: multiplier,
      expCount: expCount,
      expirations: expirations,
      strikes: strikes,
    });
  },



  [IncomeMessageType.SECURITY_DEFINITION_OPTION_PARAMETER_END]: function (fields) {
    this.emit('SECURITY_DEFINITION_OPTION_PARAMETER_END', fields);
    fields.shift();
    let requestId = parseInt(fields.shift());
    this.requestIdResolve(requestId, this.requestIdStorageArray(requestId));
  },



  // HandleInfo(proc=processSoftDollarTiersMsg),
  [IncomeMessageType.SOFT_DOLLAR_TIERS]: function (fields) {
    this.emit('SOFT_DOLLAR_TIERS', fields);
  },
  // HandleInfo(proc=processFamilyCodesMsg),
  [IncomeMessageType.FAMILY_CODES]: function (fields) {
    this.emit('FAMILY_CODES', fields);
  },
  // HandleInfo(proc=processSymbolSamplesMsg),
  [IncomeMessageType.SYMBOL_SAMPLES]: function (fields) {
    this.emit('SYMBOL_SAMPLES', fields);
  },
  // HandleInfo(proc=processSmartComponents),
  [IncomeMessageType.SMART_COMPONENTS]: function (fields) {
    this.emit('SMART_COMPONENTS', fields);
  },



  [IncomeMessageType.TICK_REQ_PARAMS]: function (fields) {
    this.emit('TICK_REQ_PARAMS', fields);
    handler_TICK_REQ_PARAMS.bind(this)(fields);
  },



  // HandleInfo(proc=processMktDepthExchanges),
  [IncomeMessageType.MKT_DEPTH_EXCHANGES]: function (fields) {
    this.emit('MKT_DEPTH_EXCHANGES', fields);
  },



  [IncomeMessageType.HEAD_TIMESTAMP]: function (fields) {
    this.emit('HEAD_TIMESTAMP', fields);
    fields.shift();
    let requestId = parseInt(fields.shift());
    let headTimestamp = fields.shift();
    this.requestIdResolve(requestId, headTimestamp);
  },



  // HandleInfo(proc=processTickNews),
  [IncomeMessageType.TICK_NEWS]: function (fields) {
    this.emit('TICK_NEWS', fields);
  },
  // HandleInfo(proc=processNewsProviders),
  [IncomeMessageType.NEWS_PROVIDERS]: function (fields) {
    this.emit('NEWS_PROVIDERS', fields);
  },
  // HandleInfo(proc=processNewsArticle),
  [IncomeMessageType.NEWS_ARTICLE]: function (fields) {
    this.emit('NEWS_ARTICLE', fields);
  },
  // HandleInfo(proc=processHistoricalNews),
  [IncomeMessageType.HISTORICAL_NEWS]: function (fields) {
    this.emit('HISTORICAL_NEWS', fields);
  },
  // HandleInfo(proc=processHistoricalNewsEnd),
  [IncomeMessageType.HISTORICAL_NEWS_END]: function (fields) {
    this.emit('HISTORICAL_NEWS_END', fields);
  },
  // HandleInfo(proc=processHistogramData),
  [IncomeMessageType.HISTOGRAM_DATA]: function (fields) {
    this.emit('HISTOGRAM_DATA', fields);
  },
  // HandleInfo(proc=processRerouteMktDataReq),
  [IncomeMessageType.REROUTE_MKT_DATA_REQ]: function (fields) {
    this.emit('REROUTE_MKT_DATA_REQ', fields);
  },
  // HandleInfo(proc=processRerouteMktDepthReq),
  [IncomeMessageType.REROUTE_MKT_DEPTH_REQ]: function (fields) {
    this.emit('REROUTE_MKT_DEPTH_REQ', fields);
  },
  // HandleInfo(proc=processMarketRuleMsg),
  [IncomeMessageType.MARKET_RULE]: function (fields) {
    this.emit('MARKET_RULE', fields);
  },
  // HandleInfo(proc=processPnLMsg),
  [IncomeMessageType.PNL]: function (fields) {
    this.emit('PNL', fields);
  },
  // HandleInfo(proc=processPnLSingleMsg),
  [IncomeMessageType.PNL_SINGLE]: function (fields) {
    this.emit('PNL_SINGLE', fields);
  },



  [IncomeMessageType.HISTORICAL_TICKS]: function (fields) {
    this.emit('HISTORICAL_TICKS', fields);
    fields.shift();
    let requestId = parseInt(fields.shift());
    let tickCount = parseInt(fields.shift());

    let ticks = [];

    for (let n = 0; n < tickCount; n++) {
      let historicalTick = {
        time: parseInt(fields.shift())
      };
      fields.shift();   // for consistency
      historicalTick.price = parseFloat(fields.shift());
      historicalTick.size = parseInt(fields.shift());
      ticks.push(historicalTick);
    }

    let done = fields.shift();
    console.log('historical done ' + done);

    this.requestIdResolve(requestId, ticks);
  },



  [IncomeMessageType.HISTORICAL_TICKS_BID_ASK]: function (fields) {
    this.emit('HISTORICAL_TICKS_BID_ASK', fields);
    fields.shift();
    let requestId = parseInt(fields.shift());
    let tickCount = parseInt(fields.shift());

    let ticks = [];

    for (let n = 0; n < tickCount; n++) {
      let historicalTickBidAsk = {
        time: parseInt(fields.shift())
      };

      historicalTickBidAsk.mask = parseInt(fields.shift());
      /*tickAttribBidAsk = TickAttribBidAsk()
      tickAttribBidAsk.askPastHigh = mask & 1 != 0
      tickAttribBidAsk.bidPastLow = mask & 2 != 0
      historicalTickBidAsk.tickAttribBidAsk = tickAttribBidAsk*/
      historicalTickBidAsk.priceBid = parseFloat(fields.shift());
      historicalTickBidAsk.priceAsk = parseFloat(fields.shift());
      historicalTickBidAsk.sizeBid = parseInt(fields.shift());
      historicalTickBidAsk.sizeAsk = parseInt(fields.shift());
      ticks.push(historicalTickBidAsk);
    }

    let done = fields.shift();
    console.log('historical done ' + done);

    this.requestIdResolve(requestId, ticks);
  },



  [IncomeMessageType.HISTORICAL_TICKS_LAST]: function (fields) {
    this.emit('HISTORICAL_TICKS_LAST', fields);
    fields.shift();
    let requestId = parseInt(fields.shift());
    let tickCount = parseInt(fields.shift());

    let ticks = [];

    for (let n = 0; n < tickCount; n++) {
      let historicalTickLast = {
        time: parseInt(fields.shift()),
        mask: parseInt(fields.shift()),
        /*
        tickAttribLast = TickAttribLast()
        tickAttribLast.pastLimit = mask & 1 != 0
        tickAttribLast.unreported = mask & 2 != 0
        historicalTickLast.tickAttribLast = tickAttribLast
        */
        price: parseFloat(fields.shift()),
        size: parseInt(fields.shift()),
        exchange: fields.shift(),
        specialConditions: fields.shift()
      };

      ticks.push(historicalTickLast);
    }

    let done = fields.shift();

    console.log('historical done ' + done);
    console.log(requestId);

    this.requestIdResolve(requestId, ticks);
  },



  [IncomeMessageType.TICK_BY_TICK]: function (fields) {
    this.emit('TICK_BY_TICK', fields);
    handler_TICK_BY_TICK.bind(this)(fields);
  },


  // HandleInfo(proc=processOrderBoundMsg),
  [IncomeMessageType.ORDER_BOUND]: function (fields) {
    this.emit('ORDER_BOUND', fields);
  },



  [IncomeMessageType.COMPLETED_ORDER]: function (fields) {
    this.emit('COMPLETED_ORDER', fields);
    handler_COMPLETED_ORDER.bind(this)(fields);
  },



  [IncomeMessageType.COMPLETED_ORDERS_END]: function (fields) {
    this.emit('COMPLETED_ORDERS_END', fields);
    this.messageTypeResolve(IncomeMessageType.COMPLETED_ORDERS_END,
      this.messageTypeStorageArray(IncomeMessageType.COMPLETED_ORDERS_END));
  },



  [IncomeMessageType._SERVER_VERSION]: function (fields) {
    this.emit('_SERVER_VERSION', fields);
    const serverVersion = parseInt(fields[0]);
    debuglog('Logged on to server version ' + serverVersion);
    this.messageTypeResolve(IncomeMessageType._SERVER_VERSION, serverVersion);
  }
};
