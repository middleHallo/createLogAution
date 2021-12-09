let fs = require('fs');
let currentTradesArr = new Array();
let allTradesArr = new Array();
// 表头
let tableHeader = ['涡轮代码','发行商','涡轮买入价格','涡轮买入数量(k)','买入成交金额','交易费用1','交易费用2',
'净成交金额','空白','涡轮卖出价格','卖出数量','卖出成交金额','交易费用1','交易费用2','净成交金额','空白','买入时间','正股号码','涡轮号码','发行商']
allTradesArr.push(tableHeader);
let tradesToCsvArr = new Array();

// 把交易记录中按照buy和sell分出来
let buyTradesArr = new Array();
let sellTradesArr = new Array();
// 用于保存当前当前交易是否相同
let spaceStr = '1';
// 读取当日导出的交易记录
function getCurrentTrades(){
	fs.readFile('data.csv',function(err,bufferData){
		let str = bufferData.toString();
		let arr = str.split('\n'); // 一重数组，每个值都是1个长字符串，各字段间以,分割
		arr.map(function(line,index){
			if(index != 0){
				let temp = line.split(',');
				currentTradesArr.push(temp);
			}
		});
		// 防止头部和尾部有空字符串导致数据出错
		if(currentTradesArr[0].length < 10){
			currentTradesArr.shift();
		}
		let lastIndex = currentTradesArr.length - 1;
		if(currentTradesArr[lastIndex].length < 10){
			currentTradesArr.pop();
		}
		
		// 按id排序(本质上是交易时间)
		currentTradesArr.sort(function(sortItem1,sortItem2){
			let resultById = sortItem1[0] - sortItem2[0];
			return resultById;
		})
		
		separateTradesArrByType();
		makeTradesToCsvfn();
	})
}

// 分开不同的交易数据
function separateTradesArrByType(){
	// 因为同一笔买卖分作了两条数据，所以先要把他们找出来
	for(let tradesIndex = 0;tradesIndex < currentTradesArr.length;tradesIndex++){
		// 当前每笔交易(数组类型)
		let currentTrade = currentTradesArr[tradesIndex];
		let tradeType = currentTrade[1];
		// 深拷贝
		let newCurrentTrade = JSON.parse(JSON.stringify(currentTrade));
		newCurrentTrade.push(11); // 到后面用于标识当前
		if(tradeType == 'BUY'){
			buyTradesArr.push(newCurrentTrade);
		}else{
			sellTradesArr.push(newCurrentTrade);
		}
	}
	setMyMouldTemple();
	
}

// 设置输出模板
/**
 * 为了保证是同一笔交易，导出的时候要按updateTime up导出
 * 最近的一笔买入匹配最近的一笔卖出
 * 但是买入和卖出的数量不一定是相等的
 */
function setMyMouldTemple(){
	
	// 循环买和卖数组，匹配上交易
	for(let bId = 0;bId<buyTradesArr.length;bId++){
		let bTradeArr = buyTradesArr[bId];
		let sTempId = 0;
		let isShift = false; // 是否弹出卖的
		
		let bTradeArrLastId = bTradeArr.length-1;
		// 记录的涡轮代码 买入数量 交易数量、涡轮买入价格
		let bWarrCodeStr = bTradeArr[2];
		let bWarrCode = bWarrCodeStr.substr(0,5); // 涡轮代码
		let bWarrNum = bTradeArr[5]; // 买入时的交易数量(单位 个)
		
		for(let sId=0;sId<sellTradesArr.length;sId++){
			
			let sTradeArr = sellTradesArr[sId];
			let sTradeArrLastId = sTradeArr.length - 1;
			let sWarrCodeStr = sTradeArr[2];
			let sWarrCode = bWarrCodeStr.substr(0,5);// 卖出时的涡轮代码
			let sWarrNum = sTradeArr[5]; // 卖出时的交易数量(单位 个)
			// 不是同一笔交易则continue
			// 不等于11 说明当前这笔sell or buy已经处理过了
			if((bWarrCode == sWarrCode) && (sTradeArr[sTradeArrLastId] == 11) && (bTradeArr[bTradeArrLastId] == 11)){
				pushSameTradeToArr(bTradeArr,sTradeArr);
			}		
			// 看该交易是否已经匹配过了，且是否是同一笔交易(交易数量是否相等)
			// 如果同则构造交易数据,否则按一下规则处理
			
		}
	}
}

// 构造交易数据
// 涡轮号码、发行商、涡轮买入价格、买入数量、成交金额、交易费用1、交易费用2、净成交金额、空格、
// 涡轮卖出价格、卖出数量、卖出成交金额、交易费用1、交易费用2、净成交金额、空格
// 净赢/亏(港币)、净赢/亏(格式)、净赢/亏(笔数)、空格
// 买入时间、正股号码、发行商、买卖数量(k)、最大承受数量、盈亏(格数)
function pushSameTradeToArr(bTradeArr,sTradeArr){
	// 比如出现买了2笔以上的货，100k 200k 卖300k
	// 此时记录应该以买为准，记录100k，然后内循环中会继续下去，但此时外循环当前这一笔买的记录不应再继续，但无法中断原本的循环
	let bTradeArrLastId = bTradeArr.length - 1;
	let sTradeArrLastId = sTradeArr.length - 1;
	// 记录的涡轮代码 发行商 涡轮买入价格 买入数量 交易成交金额、买入费用1、买入费用2、净成交金额(含手续费)
	let bWarrCodeStr = bTradeArr[2];
	let bWarrCode = bWarrCodeStr.substr(0,5);// 涡轮代码
	let sWarrCodeStr = sTradeArr[2];
	let sWarrCode = sWarrCodeStr.substr(0,5);
	if(bTradeArr[bTradeArrLastId] != 11 || sTradeArr[sTradeArrLastId] != 11){
		return 0;
	}
	if(bWarrCode != sWarrCode){
		return 0;
	}
	
	let fxs = ''; // 发行商
	let bWarrPrice = bTradeArr[4]; // 涡轮买入价格
	let bWarrCount = bTradeArr[6]; // 买入数量(单位 个)
	let bWarrCountK = Number(bWarrCount/1000); // 交易数量(单位 k)
	
	// 卖出
	let sWarrPrice = sTradeArr[4]; // 涡轮卖出价格
	let sWarrCount = sTradeArr[6]; // 涡轮卖出数量
	let sWarrCountK = Number(sWarrCount/1000); // 交易数量 k
	// let bsprice = `买卖价格：${bWarrPrice},${sWarrPrice}`;
	// console.log(bsprice);
	
	let logStr = `bcode=${bWarrCode},scode=${sWarrCode},bprice=${bWarrPrice},sprice=${sWarrPrice}`;
	console.log(logStr);
	
	
	// 买入时间 正股号码 涡轮代码 发行商 买卖数量 
	let tradeUpdateTimeStr = bTradeArr[9];
	let tradeUpdateTimeArr = tradeUpdateTimeStr.split(' ');
	let tradeUpdateTime = tradeUpdateTimeArr[1];
	let buyTimeArr = tradeUpdateTime.split(':');
	let buyTime = buyTimeArr[0] + '.' + buyTimeArr[1];
	
	let sharesStr = bTradeArr[10];
	let sharesStrArr = sharesStr.split('.');
	let sharesCode = sharesStrArr[0];
	
	let tradeCountK = 0;
	let tradeCount = 0;
	
	if(bWarrCount == sWarrCount){
		tradeCountK = bWarrCountK;
		tradeCount = bWarrCount;
		bTradeArr[bTradeArrLastId] = 12;
		sTradeArr[sTradeArrLastId] = 12;
	}else if(bWarrCount > sWarrCount){
		tradeCountK = sWarrCountK;
		tradeCount = sWarrCount;
		bTradeArr[6] = bWarrCount- sWarrCount;
		sTradeArr[sTradeArrLastId] = 12;
		
	}else{
		tradeCountK = bWarrCountK;
		tradeCount = bWarrCount;
		sTradeArr[6] = sWarrCount - bWarrCount;
		bTradeArr[bTradeArrLastId] = 12;
	}
	
	// 买卖交易K数是固定的，
	let bWarrAmount = tradeCount * bWarrPrice; // 成交金额
	let bjyfy1 = 0;
	let bjyfy2 = 0;
	let bWarrAmountAll =bWarrAmount + bjyfy1 + bjyfy2; // 净成交金额(含手续费)
	
	let sWarrAmount = tradeCount * sWarrPrice; // 卖出成交金额
	let sjyfy1 = 0;
	let sjyfy2 = 0;
	let sWarrAmountAll = sWarrAmount + sjyfy1 + sjyfy2; // 卖出成交金额(含手续费)
	
	let muldArr = new Array();
	muldArr.push(bWarrCode);
	muldArr.push(fxs);
	muldArr.push(bWarrPrice);
	muldArr.push(tradeCountK)
	muldArr.push(bWarrAmount);
	muldArr.push(bjyfy1);
	muldArr.push(bjyfy2);
	muldArr.push(bWarrAmountAll);
	
	muldArr.push(spaceStr);
	
	muldArr.push(sWarrPrice);
	muldArr.push(tradeCountK);
	muldArr.push(sWarrAmount);
	muldArr.push(sjyfy1);
	muldArr.push(sjyfy2);
	muldArr.push(sWarrAmountAll);
	
	muldArr.push(spaceStr);
	
	muldArr.push(buyTime);
	muldArr.push(sharesCode);
	muldArr.push(bWarrCode);
	muldArr.push(fxs);
	muldArr.push(tradeCountK);
	
	
	allTradesArr.push(muldArr);
}


function makeTradesToCsvfn(){
	let pnl = 0;
	
	for(let index = 0;index < allTradesArr.length;index++){
		let line = allTradesArr[index];
		// 跳过表头
		if(index != 0){
			let tempPnl = line[11] - line[4];
			pnl =pnl + tempPnl;
		}
		
		let str = line.toString();
		str.trim();
		tradesToCsvArr.push(str);
	}
	let pnlNum = parseInt(pnl);
	console.log('pnl=' + pnlNum);
	writeToTempleFile();
}

function writeToTempleFile(){
	let currentTradesStr = '';
	for(let index = 0;index < tradesToCsvArr.length;index++){
		let line = tradesToCsvArr[index];
		currentTradesStr += line;
		currentTradesStr += '\n'
	}
	// let currentTradesStr = tradesToCsvArr.toString();
	fs.writeFile('temp.csv',currentTradesStr,function(err){
		if(err == null){
			console.log('生成交易表成功')
		}else{
			console.log('好像出错了，将就用一下吧');
			console.log(err)
		}
	})
}

getCurrentTrades();

// tradesToCsvArr.toString();
