var redis = require('redis');
var redisai = require('redisai-js');

(async () => {
  const nativeClient = redis.createClient();
  const aiclient = new redisai.Client(nativeClient);
  const tensorA = new redisai.Tensor(redisai.Dtype.float32, [1, 2], [2, 3]);
  const tensorB = new redisai.Tensor(redisai.Dtype.float32, [1, 2], [3, 5]);
  const script_str = 'def bar(a, b):\n    return a + b\n';

  const result_tA = await aiclient.tensorset('tA', tensorA);
  const result_tB = await aiclient.tensorset('tB', tensorB);
  // AI.TENSORSET tA result: OK
  console.log(`AI.TENSORSET tA result: ${result_tA}`);
  // AI.TENSORSET tB result: OK
  console.log(`AI.TENSORSET tB result: ${result_tB}`);

  const myscript = new redisai.Script('CPU', script_str);

  const result_scriptSet = await aiclient.scriptset('myscript', myscript);

  // AI.SCRIPTSET result: OK
  console.log(`AI.SCRIPTSET result: ${result_scriptSet}`);

  const result_scriptRun = await aiclient.scriptrun('myscript', 'bar', ['tA', 'tB'], ['tD']);

  console.log(`AI.SCRIPTRUN result: ${result_scriptRun}`);
  const tensorD = await aiclient.tensorget('tD');

  // AI.TENSORGET tD reply: datatype FLOAT shape [1,2] , data [5,8]
  console.log(`AI.TENSORGET tD reply: datatype ${tensorD.dtype} shape [${tensorD.shape}] , data [${tensorD.data}]`);

  await aiclient.end();
})();