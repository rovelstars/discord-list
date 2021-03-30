module.exports = function isthere(schema, options) {
    schema.statics.isthere = async function (query) {
        const result = await this.findOne(query).select("id").lean();
        return result ? true : false;
      };
  }