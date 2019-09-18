export class BufferReader {
    private position: number;
    private data: DataView;

    constructor(buffer: ArrayBufferLike) {
      this.position = 0;
      this.data = new DataView(buffer);
    }

    public read(length: number) {
      const value = this.data.buffer.slice(this.position, this.position + length);
      this.position += length;
      return value;
    }

    public int8() {
      const value = this.data.getInt8(this.position);
      this.position += 1;
      return value;
    }

    public uint8() {
      const value = this.data.getUint8(this.position);
      this.position += 1;
      return value;
    }

    public uint16() {
      const value = this.data.getUint16(this.position);
      this.position += 2;
      return value;
    }

    public uint32() {
      const value = this.data.getUint32(this.position);
      this.position += 4;
      return value;
    }

    public string(length: number) {
      return new TextDecoder('ascii').decode(this.read(length));
    }

    public eof() {
      return this.position >= this.data.byteLength;
    }

    /**
     * Read a MIDI-style variable-length integer.
     * (big-endian value in groups of 7 bits, with top bit set to signify that another byte follows)
     */
    public midiInt() {
      let result = 0;
      while (true) {
        const value = this.uint8();
        // tslint:disable-next-line:no-bitwise
        if (value & 0b10000000) {
          // tslint:disable-next-line:no-bitwise
          result += value & 0b1111111;
          // tslint:disable-next-line:no-bitwise
          result <<= 7;
        } else {
          return result + value;
        }
      }
    }

    public midiChunk() {
      const id = this.string(4);
      const length = this.uint32();
      const data = this.read(length);
      return { id, length, data };
    }
  }
