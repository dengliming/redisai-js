import { Client } from '../src/client';
import { createClient } from 'redis';
import { Tensor } from '../src/tensor';
import { Dtype } from '../src/dtype';
import 'mocha';
import { expect } from 'chai';
import { Model } from '../src/model';
import * as fs from 'fs';
import { Backend } from '../src/backend';
import { Script } from '../src/script';
import { Helpers, Stats } from '../src';
import util from 'util';
// tslint:disable-next-line:no-var-requires
const Jimp = require('jimp');

const mochaAsync = (fn: any) => {
  return (done: any) => {
    fn.call().then(done, (err: Error) => {
      done(err);
    });
  };
};

it(
  'test vanilla client access',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    const result = await util.promisify(aiclient.client.set).bind(aiclient.client)('redisai-js-foo', 'foo');
    expect(result).to.equal('OK');
    aiclient.end(true);
  }),
);

it(
  'ai.tensorset positive testing without data',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    const tensor = new Tensor(Dtype.float32, [1, 1], null);
    const result = await aiclient.tensorset('t1', tensor);
    expect(result).to.equal('OK');
    aiclient.end(true);
  }),
);

it(
  'ai.tensorset positive testing with data',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    const tensor = new Tensor(Dtype.float32, [1, 2], [3, 5]);
    const result = await aiclient.tensorset('t1', tensor);
    expect(result).to.equal('OK');
    aiclient.end(true);
  }),
);

it(
  'ai.tensorset negative testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    const tensor = new Tensor(Dtype.float32, [-1, 1], null);
    try {
      const result = await aiclient.tensorset('t1', tensor);
    } catch (e) {
      expect(e.toString()).to.equal('ReplyError: ERR invalid or negative value found in tensor shape');
    }
    aiclient.end(true);
  }),
);

it(
  'ai.tensorset/ai.tensorget positive testing with data',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    const tensor = new Tensor(Dtype.float32, [1, 2], [3, 5]);
    const result = await aiclient.tensorset('t1', tensor);
    expect(result).to.equal('OK');
    const tensorg = await aiclient.tensorget('t1');
    for (let i = 0; i < tensor.data.length; i++) {
      expect(tensorg.data[i]).to.equal(tensor.data[i]);
    }
    aiclient.end(true);
  }),
);

it(
  'ai.tensorset/ai.tensorget positive testing with default data',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    const tensor = new Tensor(Dtype.float32, [1, 2], null);
    const result = await aiclient.tensorset('t1', tensor);
    expect(result).to.equal('OK');
    const tensorg = await aiclient.tensorget('t1');
    for (let i = 0; i < tensorg.data.length; i++) {
      expect(tensorg.data[i]).to.equal(0);
    }
    aiclient.end(true);
  }),
);

it(
  'ai.tensorget positive/negative testing on response parsing',
  mochaAsync(async () => {
    // empty array reply
    try {
      const mockedTensorGetReply = [];
      const result = await Tensor.NewTensorFromTensorGetReply(mockedTensorGetReply);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.TENSORGET reply did not had the full elements to build the Tensor. Missing dtype,shape,values.',
      );
    }
    // missing dtype
    try {
      const mockedTensorGetReply2 = ['shape', [1], 'values', [10]];
      const result12 = await Tensor.NewTensorFromTensorGetReply(mockedTensorGetReply2);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.TENSORGET reply did not had the full elements to build the Tensor. Missing dtype.',
      );
    }
    // missing shape
    try {
      const mockedTensorGetReply3 = ['dtype', 'FLOAT', 'values', [10]];
      const result3 = await Tensor.NewTensorFromTensorGetReply(mockedTensorGetReply3);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.TENSORGET reply did not had the full elements to build the Tensor. Missing shape.',
      );
    }
    // missing values
    try {
      const mockedTensorGetReply4 = ['dtype', 'FLOAT', 'shape', [1]];
      const result4 = await Tensor.NewTensorFromTensorGetReply(mockedTensorGetReply4);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.TENSORGET reply did not had the full elements to build the Tensor. Missing values.',
      );
    }
    // ok
    const mockedTensorGetReply5 = ['dtype', 'FLOAT', 'shape', [1], 'values', [10]];
    const tensor = await Tensor.NewTensorFromTensorGetReply(mockedTensorGetReply5);
    expect(tensor.data[0]).to.closeTo(10.0, 0.1);
  }),
);

it(
  'ai.tensorset/ai.tensorget positive testing with default data',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    const inputImage = await Jimp.read('./tests/test_data/panda-224x224.jpg');
    const imageWidth = 224;
    const imageHeight = 224;
    const image = inputImage.cover(imageWidth, imageHeight);
    const helpers = new Helpers();
    const normalized = helpers.normalizeRGB(image.bitmap.data);
    const buffer = Buffer.from(normalized.buffer);
    const tensor = new Tensor(Dtype.float32, [imageWidth, imageHeight, 3], buffer);
    const result = await aiclient.tensorset('tensor-image', tensor);
    expect(result).to.equal('OK');
    aiclient.end(true);
  }),
);

it(
  'ai.tensorget negative testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    try {
      const result = await aiclient.tensorget('dontexist');
    } catch (e) {
      expect(e.toString()).to.equal('ReplyError: ERR tensor key is empty');
    }
    aiclient.end(true);
  }),
);

it(
  'ai.modelset modelOnnx linear_iris testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    const modelBlobOnnx: Buffer = fs.readFileSync('./tests/test_data/linear_iris.onnx');
    const modelOnnx = new Model(Backend.ONNX, 'CPU', [], [], modelBlobOnnx);
    const result = await aiclient.modelset('modelOnnx', modelOnnx);
    expect(result).to.equal('OK');
    aiclient.end(true);
  }),
);

it(
  'ai.modelset modelOnnx mnist testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    const modelBlobOnnx: Buffer = fs.readFileSync('./tests/test_data/mnist.onnx');
    const modelOnnx = new Model(Backend.ONNX, 'CPU', [], [], modelBlobOnnx);
    const result = await aiclient.modelset('mnist', modelOnnx);
    expect(result).to.equal('OK');
    aiclient.end(true);
  }),
);

it(
  'ai.modelset positive testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    const modelBlob: Buffer = fs.readFileSync('./tests/test_data/graph.pb');
    const model = new Model(Backend.TF, 'CPU', ['a', 'b'], ['c'], modelBlob);
    const result = await aiclient.modelset('m1', model);
    expect(result).to.equal('OK');
    aiclient.end(true);
  }),
);

it(
  'ai.modelset tiny-yolo-voc testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    const modelBlob: Buffer = fs.readFileSync('./tests/test_data/tiny-yolo-voc.pb');
    const model = new Model(Backend.TF, 'CPU', ['input'], ['output'], modelBlob);
    const result = await aiclient.modelset('tiny-yolo-voc', model);
    expect(result).to.equal('OK');
    aiclient.end(true);
  }),
);

it(
  'ai.modelrun positive testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);

    const tensorA = new Tensor(Dtype.float32, [1, 2], [2, 3]);
    const resultA = await aiclient.tensorset('tensorA', tensorA);
    expect(resultA).to.equal('OK');

    const tensorB = new Tensor(Dtype.float32, [1, 2], [3, 5]);
    const resultB = await aiclient.tensorset('tensorB', tensorB);
    expect(resultB).to.equal('OK');

    const modelBlob: Buffer = fs.readFileSync('./tests/test_data/graph.pb');
    const model = new Model(Backend.TF, 'CPU', ['a', 'b'], ['c'], modelBlob);
    const resultModelSet = await aiclient.modelset('mymodel', model);
    expect(resultModelSet).to.equal('OK');

    const resultModelRun = await aiclient.modelrun('mymodel', ['tensorA', 'tensorB'], ['tensorC']);
    expect(resultModelRun).to.equal('OK');

    const tensorC = await aiclient.tensorget('tensorC');
    expect(tensorC.data[0]).to.closeTo(6.0, 0.1);
    expect(tensorC.data[1]).to.closeTo(15.0, 0.1);

    aiclient.end(true);
  }),
);

it(
  'ai.modelrun with tag positive testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);

    const tensorA = new Tensor(Dtype.float32, [1, 2], [2, 3]);
    const resultA = await aiclient.tensorset('tensorA', tensorA);
    expect(resultA).to.equal('OK');

    const tensorB = new Tensor(Dtype.float32, [1, 2], [3, 5]);
    const resultB = await aiclient.tensorset('tensorB', tensorB);
    expect(resultB).to.equal('OK');

    const modelBlob: Buffer = fs.readFileSync('./tests/test_data/graph.pb');
    const model = new Model(Backend.TF, 'CPU', ['a', 'b'], ['c'], modelBlob);
    model.tag = 'test_tag';
    const resultModelSet = await aiclient.modelset('mymodel-wtag', model);
    expect(resultModelSet).to.equal('OK');

    const resultModelRun = await aiclient.modelrun('mymodel-wtag', ['tensorA', 'tensorB'], ['tensorC']);
    expect(resultModelRun).to.equal('OK');

    const tensorC = await aiclient.tensorget('tensorC');
    expect(tensorC.data[0]).to.closeTo(6.0, 0.1);
    expect(tensorC.data[1]).to.closeTo(15.0, 0.1);

    let modelInfo = await aiclient.info('mymodel-wtag');
    expect(modelInfo.key).to.equal('mymodel-wtag');
    expect(modelInfo.tag).to.equal('test_tag');
    expect(modelInfo.calls).to.equal(1);

    // reset stats and get new counter
    const resultModelResetStat = await aiclient.infoResetStat('mymodel-wtag');
    expect(resultModelResetStat).to.equal('OK');
    modelInfo = await aiclient.info('mymodel-wtag');
    expect(modelInfo.calls).to.equal(0);

    aiclient.end(true);
  }),
);

it(
  'ai.modeldel positive testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);

    const modelBlob: Buffer = fs.readFileSync('./tests/test_data/graph.pb');
    const model = new Model(Backend.TF, 'CPU', ['a', 'b'], ['c'], modelBlob);
    model.tag = 'test_tag';
    const resultModelSet = await aiclient.modelset('mymodel-wtag', model);
    expect(resultModelSet).to.equal('OK');

    const resultModelDel = await aiclient.modeldel('mymodel-wtag');
    expect(resultModelDel).to.equal('OK');
    aiclient.end(true);
  }),
);

it(
  'ai.modelget positive testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);

    const modelBlob: Buffer = fs.readFileSync('./tests/test_data/graph.pb');
    const model = new Model(Backend.TF, 'CPU', ['a', 'b'], ['c'], modelBlob);
    model.tag = 'test_tag';
    const resultModelSet = await aiclient.modelset('mymodel', model);
    expect(resultModelSet).to.equal('OK');

    const modelOut = await aiclient.modelget('mymodel');
    expect(modelOut.blob.toString()).to.equal(modelBlob.toString());
    aiclient.end(true);
  }),
);

it(
  'ai.modelget negative testing on response parsing',
  mochaAsync(async () => {
    // empty array reply
    try {
      const mockedReply = [];
      const result = await Model.NewModelFromModelGetReply(mockedReply);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.MODELGET reply did not had the full elements to build the Model. Missing backend,device,blob.',
      );
    }
    // missing blob
    try {
      const mockedReply = ['backend', 'TF', 'device', 'CPU'];
      const result = await Model.NewModelFromModelGetReply(mockedReply);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.MODELGET reply did not had the full elements to build the Model. Missing blob.',
      );
    }
    // missing backend
    try {
      const mockedReply = ['blob', [], 'device', 'CPU'];
      const result = await Model.NewModelFromModelGetReply(mockedReply);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.MODELGET reply did not had the full elements to build the Model. Missing backend.',
      );
    }
    // missing device
    try {
      const mockedReply = ['blob', [], 'backend', 'TF'];
      const result = await Model.NewModelFromModelGetReply(mockedReply);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.MODELGET reply did not had the full elements to build the Model. Missing device.',
      );
    }
  }),
);

it(
  'ai.scriptrun with tag positive testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);

    const scriptFileStr: string = fs.readFileSync('./tests/test_data/script.txt').toString();
    const scriptStr: string = 'def bar(a, b):\n    return a + b\n';

    const tensorA = new Tensor(Dtype.float32, [1, 2], [2, 3]);
    const resultA = await aiclient.tensorset('tensorA', tensorA);
    expect(resultA).to.equal('OK');

    const tensorB = new Tensor(Dtype.float32, [1, 2], [3, 5]);
    const resultB = await aiclient.tensorset('tensorB', tensorB);
    expect(resultB).to.equal('OK');

    const script = new Script('CPU', scriptFileStr);

    const script2 = new Script('CPU', scriptStr);
    script2.tag = 'test_tag';

    const resultScriptSet = await aiclient.scriptset('myscript', script);
    expect(resultScriptSet).to.equal('OK');

    const resultScriptSetWithTag = await aiclient.scriptset('myscript-wtag', script2);
    expect(resultScriptSetWithTag).to.equal('OK');

    const resultScriptRun = await aiclient.scriptrun('myscript', 'bar', ['tensorA', 'tensorB'], ['tensorC']);
    const resultScriptRunWithTag = await aiclient.scriptrun(
      'myscript-wtag',
      'bar',
      ['tensorA', 'tensorB'],
      ['tensorD'],
    );
    expect(resultScriptRun).to.equal('OK');
    expect(resultScriptRunWithTag).to.equal('OK');

    const tensorC = await aiclient.tensorget('tensorC');
    expect(tensorC.data[0]).to.closeTo(5.0, 0.1);
    expect(tensorC.data[1]).to.closeTo(8.0, 0.1);

    const tensorD = await aiclient.tensorget('tensorD');
    expect(tensorD.data[0]).to.closeTo(5.0, 0.1);
    expect(tensorD.data[1]).to.closeTo(8.0, 0.1);

    const scriptInfo = await aiclient.info('myscript');
    expect(scriptInfo.key).to.equal('myscript');
    expect(scriptInfo.calls).to.equal(1);

    let scriptInfoTag = await aiclient.info('myscript-wtag');
    expect(scriptInfoTag.key).to.equal('myscript-wtag');
    expect(scriptInfoTag.tag).to.equal('test_tag');
    expect(scriptInfoTag.calls).to.equal(1);

    // reset stats and get new counter
    const resultScriptResetStat = await aiclient.infoResetStat('myscript-wtag');
    expect(resultScriptResetStat).to.equal('OK');
    scriptInfoTag = await aiclient.info('myscript-wtag');
    expect(scriptInfoTag.calls).to.equal(0);

    aiclient.end(true);
  }),
);

it(
  'ai.scriptdel positive testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);

    const scriptStr: string = 'def bar(a, b):\n    return a + b\n';
    const script = new Script('CPU', scriptStr);

    const resultScriptSet = await aiclient.scriptset('myscript', script);
    expect(resultScriptSet).to.equal('OK');

    const resultScriptDel = await aiclient.scriptdel('myscript');
    expect(resultScriptDel).to.equal('OK');
    aiclient.end(true);
  }),
);

it(
  'ai.scriptget positive testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);

    const scriptStr: string = 'def bar(a, b):\n    return a + b\n';
    const script = new Script('CPU', scriptStr);

    const resultScriptSet = await aiclient.scriptset('myscript', script);
    expect(resultScriptSet).to.equal('OK');

    const scriptOut = await aiclient.scriptget('myscript');
    expect(scriptOut.script).to.equal(scriptStr);

    const scriptInfo = await aiclient.info('myscript');
    expect(scriptInfo.key).to.equal('myscript');
    aiclient.end(true);
  }),
);

it(
  'ai.scriptget negative testing on response parsing',
  mochaAsync(async () => {
    // empty array reply
    try {
      const mockedReply = [];
      const result = await Script.NewScriptFromScriptGetReply(mockedReply);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.SCRIPTGET reply did not had the full elements to build the Script. Missing device,source.',
      );
    }
    // missing source
    try {
      const mockedReply = ['device', 'CPU'];
      const result = await Script.NewScriptFromScriptGetReply(mockedReply);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.SCRIPTGET reply did not had the full elements to build the Script. Missing source.',
      );
    }
    // missing device
    try {
      const mockedReply = ['source', ''];
      const result = await Script.NewScriptFromScriptGetReply(mockedReply);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.SCRIPTGET reply did not had the full elements to build the Script. Missing device.',
      );
    }
  }),
);

it(
  'ai.info negative testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    try {
      const result = await aiclient.info('dontexist');
    } catch (e) {
      expect(e.toString()).to.equal('ReplyError: ERR cannot find run info for key');
    }
    aiclient.end(true);
  }),
);

it(
  'ai.info negative testing on response parsing',
  mochaAsync(async () => {
    // empty array reply
    try {
      const mockedReply = [];
      const result = await Stats.NewStatsFromInfoReply(mockedReply);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.INFO reply did not had the full elements to build the Stats. Missing key,type,backend,device.',
      );
    }
    // missing device
    try {
      const mockedReply = ['key', 'a', 'type', 'model', 'backend', 'TF'];
      const result = await Stats.NewStatsFromInfoReply(mockedReply);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.INFO reply did not had the full elements to build the Stats. Missing device.',
      );
    }
    // missing backend
    try {
      const mockedReply = ['key', 'a', 'type', 'model', 'device', 'CPU'];
      const result = await Stats.NewStatsFromInfoReply(mockedReply);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.INFO reply did not had the full elements to build the Stats. Missing backend.',
      );
    }
    // missing type
    try {
      const mockedReply = ['key', 'a', 'backend', 'TF', 'device', 'CPU'];
      const result = await Stats.NewStatsFromInfoReply(mockedReply);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.INFO reply did not had the full elements to build the Stats. Missing type.',
      );
    }
    // missing key
    try {
      const mockedReply = ['type', 'script', 'backend', 'TF', 'device', 'CPU'];
      const result = await Stats.NewStatsFromInfoReply(mockedReply);
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: AI.INFO reply did not had the full elements to build the Stats. Missing key.',
      );
    }

    const positiveMockedReply = ['key', 'key1', 'type', 'script', 'backend', 'TF', 'device', 'CPU'];
    const stats = await Stats.NewStatsFromInfoReply(positiveMockedReply);
    expect(stats.key).to.equal('key1');
    expect(stats.type).to.equal('script');
    expect(stats.backend).to.equal(Backend.TF);
    expect(stats.device).to.equal('CPU');
    expect(stats.tag).to.equal(undefined);
    expect(stats.calls).to.equal(0);
  }),
);

it(
  'ai.scriptget negative testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    try {
      const result = await aiclient.scriptget('dontexist');
    } catch (e) {
      expect(e.toString()).to.equal('ReplyError: ERR script key is empty');
    }
    aiclient.end(true);
  }),
);

it(
  'ai.modelget negative testing',
  mochaAsync(async () => {
    const nativeClient = createClient();
    const aiclient = new Client(nativeClient);
    try {
      const result = await aiclient.modelget('dontexist');
    } catch (e) {
      expect(e.toString()).to.equal('ReplyError: ERR model key is empty');
    }
    aiclient.end(true);
  }),
);

it(
    'ai.config positive and negative testing',
    mochaAsync(async () => {
        const nativeClient = createClient();
        const aiclient = new Client(nativeClient);
        const result = await aiclient.configBackendsPath('/usr/lib/redis/modules/backends/');
        expect(result).to.equal('OK');
        // negative test
        try {
            const loadReply = await aiclient.configLoadBackend(Backend.TF, 'notexist/redisai_tensorflow.so');
        } catch (e) {
            expect(e.toString()).to.equal('ReplyError: ERR error loading backend');
        }

        try {
            // may throw error if backend already loaded
            const loadResult = await aiclient.configLoadBackend(Backend.TF, 'redisai_tensorflow/redisai_tensorflow.so');
            expect(loadResult).to.equal('OK');
        } catch (e) {
            expect(e.toString()).to.equal('ReplyError: ERR error loading backend');
        }
        aiclient.end(true);
    }),
);