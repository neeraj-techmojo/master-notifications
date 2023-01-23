const redis = require("redis");
const WebSocket = require("ws");
require("dotenv").config();
const config = process.env;
const wss = new WebSocket.Server({ port: 7079 });
const userBaseRedis = redis.createClient({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
});
let onlineUserList = {};
let duelRequestKey = "friend_requests_received_by_";
wss.on("connection", (socket, req) => {
  var userName = req.url.substr(1);
  if (!userName) {
    socket.terminate();
    return;
  }
  onlineUserList[userName] = socket;
  let userKey = duelRequestKey + userName;
  userBaseRedis.get(userKey, (err, data) => {
    if (err) {
      console.log(err);
      return;
    }
    if (data !== null) {
      socket.send(data);
    }
  });
  socket.on("message", function (message) {
    message = JSON.parse(message);
    if (message[0] == userName) {
      return;
    }
    var toUserWebSocket = onlineUserList[message[0]];
    let userKey = duelRequestKey + message[0];
    userBaseRedis.get(userKey, (err, data) => {
      if (err) {
        console.log(err);
        return;
      }

      if (data !== null) {
        data = JSON.parse(data);
        if (data) {
          data.push(userName);
          data = arrNoDupe(data);
        }
      } else {
        data = [userName];
      }
      userBaseRedis.setex(userKey, 180, JSON.stringify(data));
      if (toUserWebSocket) {
        toUserWebSocket.send(JSON.stringify(data));
      }
    });
  });
  socket.on("close", function () {
    delete onlineUserList[userName];
    console.log("deleted session");
  });
});
function arrNoDupe(a) {
  var temp = {};
  for (var i = 0; i < a.length; i++) temp[a[i]] = true;
  var r = [];
  for (var k in temp) r.push(k);
  return r;
}
