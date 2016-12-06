var expect = require('expect.js');
var generator = require('../../lib/generator');

describe('Generator', function () {
    it('should generate file id', function () {
        var result = generator.generateFileId('a/b.css')
        expect(result).to.eql('7443d693');

        result = generator.generateFileId('a/b.css')
        expect(result).to.eql('7443d693');

        result = generator.generateFileId('a/b.js')
        expect(result).to.eql('66d8e6b9');
    });

    it('should generate insert css path', function () {
        var result = generator.generateInsertCssPath({
            hostPkgName: 'fisx-vue-loader',
            insertCSSPath: ''
        });
        console.log(result)
    });
});
