const dotenv = require('dotenv')
dotenv.config()
const axios = require('axios')
const moment = require('moment');


let _tclrequestverificationkey = process.env.TCLREQUESTVERIFICATIONKEY


function encrypt(str) {
    if (str == "" || str == undefined) {
        return "";
    }
    var key = process.env.ENCRYPTIONKEY; // There's a hardcoded key here.
    var str1 = [];
    var encryStr = "";
    for (var i = 0; i < str.length; i++) {
        var char_i = str.charAt(i);
        var num_char_i = char_i.charCodeAt();
        str1[2 * i] = (key[i % key.length].charCodeAt() & 0xf0) | ((num_char_i & 0xf) ^ (key[i % key.length].charCodeAt() & 0xf));
        str1[2 * i + 1] = (key[i % key.length].charCodeAt() & 0xf0) | ((num_char_i >> 4) ^ (key[i % key.length].charCodeAt() & 0xf));
    }
    for (var i = 0; i < str1.length; i++) {
        encryStr += String.fromCharCode(str1[i]);
    }
    return encryStr;
}

async function getLogin() {

    let password = process.env.PASSWORD
    let encryptedPassword = encrypt(password)


    let data = {
        "id": "12",
        "jsonrpc": "2.0",
        "method": "Login",
        "params": {
            "UserName": encryptedPassword,
            "Password": encryptedPassword
        }
    }
    let config = {
        'headers': {
            '_tclrequestverificationkey': _tclrequestverificationkey,
            '_tclrequestverificationtoken': process.env.INITIALTOKEN,
            'Referer': 'http://192.168.1.1/index.html'
        }
    }
    let response = await axios.post('http://192.168.1.1/jrd/webapi', data, config)
    return response.data
}


async function sendSMS(token, number, message) {

    let data = {
        "id": "1",
        "jsonrpc": "2.0",
        "method": "SendSMS",
        "params": {
            "SMSId": -1,
            "SMSContent": message,
            "PhoneNumber": number,
            "SMSTime": moment().format('YYYY-MM-DD HH:mm:ss')
        }
    }

    let config = {
        'headers': {
            '_tclrequestverificationkey': _tclrequestverificationkey,
            '_tclrequestverificationtoken': token,
            'Referer': 'http://192.168.1.1/index.html'
        }
    }
    let response = await axios.post('http://192.168.1.1/jrd/webapi', data, config)
    return response.data

}

async function getSMS(token, page, key) {

    let data = { "id": "12", "jsonrpc": "2.0", "method": "GetSMSListByContactNum", "params": { "Page": page, "key": key } }

    let config = {
        'headers': {
            '_tclrequestverificationkey': _tclrequestverificationkey,
            '_tclrequestverificationtoken': token,
            'Referer': 'http://192.168.1.1/index.html'
        }
    }
    let response = await axios.post('http://192.168.1.1/jrd/webapi', data, config)
    return response.data

}


async function deleteSMS(token, smsIds) {

    let data = {
        "id": "12",
        "jsonrpc": "2.0",
        "method": "DeleteSMS",
        "params": {
            "DelFlag": 3,
            "SMSArray": smsIds
        }
    }

    let config = {
        'headers': {
            '_tclrequestverificationkey': _tclrequestverificationkey,
            '_tclrequestverificationtoken': token,
            'Referer': 'http://192.168.1.1/index.html'
        }
    }

    let response = await axios.post('http://192.168.1.1/jrd/webapi', data, config)
    return response.data
}

async function deleteAllInboxSMS(token) {
    let smsList = await getSMS(token, 0, 'inbox')
    if (smsList.result.SMSList === undefined) {
        console.log('no sms found')
        return
    }
    let smsIds = smsList.result.SMSList.map(sms => sms.SMSId)
    if (smsIds === undefined) {
        console.log('no sms found')
        return
    }
    let deletedSMS = await deleteSMS(token, smsIds)
    console.log(deletedSMS)
}

async function delteAllSentSMS(token) {
    let smsList = await getSMS(token, 0, 'send')
    if (smsList.result.SMSList === undefined) {
        console.log('no sms found')
        return
    }
    let smsIds = smsList.result.SMSList.map(sms => sms.SMSId)

    if (smsIds === undefined) {
        console.log('no sms found')
        return
    }
    let deletedSMS = await deleteSMS(token, smsIds)
    console.log(deletedSMS)
}


async function deleteAllSMS(token) {
    await deleteAllInboxSMS(token)
    await delteAllSentSMS(token)
}


async function main() {
    let login = await getLogin()
    let token = await encrypt(login.result.token.toString())

    try {
        let allSms = await getSMS(token, 0, 'inbox')

        if (allSms.result.SMSList === undefined) {
            console.log('no sms found')
            return
        }
        let SMSList = allSms.result.SMSList

        let str = SMSList.filter(sms => sms.SMSContent.includes('80%') || sms.SMSContent.includes('100%'))

        let date = new Date()
        if (str.length > 0) {
            await deleteAllSMS(token)

            let sentSMS = await sendSMS(token, '1266', 'NL2000 AAN')
            console.log(sentSMS)
            console.log(date.toISOString(), 'Renew data SMS sent')
        } else {
            console.log(date.toISOString(), 'No data expiration SMS found.')
        }

    } catch (error) {
        console.log(error)
        return
    }
}



// execute the main function every 30 seconds
setInterval(main, 30000);

