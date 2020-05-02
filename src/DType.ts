export enum DType {
    float32 = 'FLOAT',
    double64 = 'DOUBLE',
    int8 = 'INT8',
    int16 = 'INT16',
    int32 = 'INT32',
    int64 = 'INT64',
    uint8 = 'UINT8',
    uint16 = 'UINT16',
}

export const DTypeMap = {
    'FLOAT': DType.float32,
    'DOUBLE': DType.double64,
    'INT8': DType.int8,
    'INT16': DType.int16,
    'INT32': DType.int32,
    'INT64': DType.int64,
    'UINT8': DType.uint8,
    'UINT16': DType.uint16,
};

export enum Backend {
    // TF represents a TensorFlow backend
    TF = 'TF',
    // Torch represents a Torch backend
    Torch = 'TORCH',
    // ONNX represents an ONNX backend
    ONNX = 'ORT',
    // TFLite represents a TensorFlow backend
    TFLite = 'TFLITE',
}

export const BackendMap = {
    'TF': Backend.TF,
    'TORCH': Backend.Torch,
    'ORT': Backend.ONNX,
    'TFLITE': Backend.TFLite,
};