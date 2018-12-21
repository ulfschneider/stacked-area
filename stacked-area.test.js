'use babel'

const fs = require('fs');
const jsdom = require('jsdom');
const {
    JSDOM
} = jsdom;
const stackedArea = require('stacked-area');
const moment = require('moment');
const NOW = '2018-09-11';
const NUMBER_OF_TEST_IMAGES = 5;
let actuals = [];
let expected = [];
let settings;


function makeTestSettings() {
    settings = {};
    let now = moment(NOW);
    settings.data = makeTestData();
    settings.svg = JSDOM.fragment('<svg></svg>').firstChild;
    settings.title = 'Testing the Stacked Area Chart';
    //settings.legendTitle = 'Issues:'
    
    settings.fromDate = moment(now).subtract(8, 'days');
    settings.toDate = moment(now).add(3, 'days');

    settings.style = {
        Highest: {
            color: '#222',
            stroke: 'white'
        },
        High: {
            color: '#555',
            stroke: 'white'
        },
        Medium: {
            color: '#888',
            stroke: 'white'
        },
        Low: {
            color: '#bbb',
            stroke: 'white'
        },
        Lowest: {
            color: '#eee',
            stroke: 'white'
        }

    }
    return settings;
}

function makeTestData() {
    let testData = {};
    let now = moment(NOW);
    testData.keys = ['Lowest', 'Low', 'Medium', 'High', 'Highest'];
    testData.entries = [];
    testData.entries.push({
        date: moment(now).subtract(8, 'days'),
        Highest: 2,
        High: 1,
        Medium: 4,
        Low: 0,
        Lowest: 1
    }, {
            date: moment(now).subtract(7, 'days'),
            Highest: 2,
            High: 1,
            Medium: 4,
            Low: 0,
            Lowest: 1
        }, {
            date: moment(now).subtract(6, 'days'),
            Highest: 3,
            High: 2,
            Medium: 6,
            Low: 1,
            Lowest: 2
        }, {
            date: moment(now).subtract(5, 'days'),
            Highest: 1,
            High: 2,
            Medium: 3,
            Low: 1,
            Lowest: 0
        }, {
            date: moment(now).subtract(4, 'days'),
            Highest: 2,
            High: 5,
            Medium: 6,
            Low: 3,
            Lowest: 2
        }, {
            date: moment(now).subtract(3, 'days'),
            Highest: 1,
            High: 4,
            Medium: 3,
            Low: 1,
            Lowest: 0
        }, {
            date: moment(now).subtract(2, 'days'),
            Highest: 1,
            High: 3,
            Medium: 2,
            Low: 1,
            Lowest: 1
        }, {
            date: moment(now).subtract(1, 'days'),
            Highest: 0,
            High: 1,
            Medium: 1,
            Low: 0,
            Lowest: 0
        }

    );
    return testData;
}


function writeTestFile(path, content) {
    fs.writeFile(path, content);
}

function readTestFile(path) {
    return fs.readFileSync(path).toString();
}

function readExpectedFiles(folder, count) {
    let expected = [];
    for(let i = 0; i < count; i++) {
        expected.push(readTestFile(folder + '/expect' + i + '.svg'));
    }
    return expected;
}

//test the functions

beforeAll(() => {
    expected = readExpectedFiles('./test', NUMBER_OF_TEST_IMAGES);
});

test('no settings at all', () => {

    //no settings at all
    let diagram = stackedArea();
    expect(() => diagram.draw())
        .toThrow(/No settings/);
});

test('empty settings', () => {
    let settings = {};
    diagram = stackedArea(settings);

    expect(() => {
        diagram.draw()
    }).toThrow(/No svg/);
});

test('no svg tag', () => {
    let settings = {};
    settings.svg = JSDOM.fragment('<div></div>').firstChild;

    expect(() => {
        diagram.draw()
    }).toThrow(/No svg/);
});


test('default width and default height', () => {
    let settings = makeTestSettings();
    delete settings.width;
    delete settings.height;
    let diagram = stackedArea(settings);
    diagram.draw();
    expect(settings.width)
        .toBe(800);
    expect(settings.height)
        .toBe(400);
});

test('default margins', () => {
    let settings = makeTestSettings();
    settings.margin = {};
    settings.width = 800;
    settings.height = 400;
    let diagram = stackedArea(settings);
    diagram.draw();
    expect(settings.margin.top)
        .toBe(50);
    expect(settings.margin.right)
        .toBe(50);
    expect(settings.margin.bottom)
        .toBe(50);
    expect(settings.margin.left)
        .toBe(50);
});

test('inner width and inner height', () => {
    let settings = makeTestSettings();
    settings.margin = {};
    let diagram = stackedArea(settings);
    diagram.draw();
    expect(settings.innerWidth)
        .toBe(800 - settings.margin.left - settings.margin.right);
    expect(settings.innerHeight)
        .toBe(400 - settings.margin.top - settings.margin.bottom);
});

test('image 1 with default test data', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing CFD';
    settings.markers = [
        {date: settings.fromDate},
        {date: settings.toDate}
    ];
    
    let diagram = stackedArea(settings);
    let actual = diagram.image();
    actuals.push(actual);

    expect(actuals[0]).toBe(expected[0]);
});

test('image 2 without markers', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing CFD without markers';
    
    let diagram = stackedArea(settings);
    let actual = diagram.image();
    actuals.push(actual);

    expect(actuals[1]).toBe(expected[1]);
});

test('image 3 with markers out of range', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing CFD with markers out of range';
    settings.markers = [
        {date: moment(settings.fromDate).subtract(2, 'days')},
        {date: moment(settings.toDate).add(2, 'days')}
    ];
    
    let diagram = stackedArea(settings);
    let actual = diagram.image();
    actuals.push(actual);

    expect(actuals[2]).toBe(expected[2]);
});

test('image 4 without fromDate and toDate', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing CFD without fromDate and toDate';
    settings.markers = [
        {date: moment(settings.fromDate).subtract(2, 'days')},
        {date: moment(settings.toDate).add(2, 'days')}
    ];
    delete settings.fromDate;
    delete settings.toDate;

    
    let diagram = stackedArea(settings);
    let actual = diagram.image();
    actuals.push(actual);

    expect(actuals[3]).toBe(expected[3]);
});

test('image 4 with legend title', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing CFD with legend title';
    settings.legendTitle = 'Issues:';
    delete settings.fromDate;
    delete settings.toDate;
    
    let diagram = stackedArea(settings);
    let actual = diagram.image();
    actuals.push(actual);

    expect(actuals[4]).toBe(expected[4]);
});


test('write test results into file', () => {
    let testFileContent = '<!DOCTYPE html>\n<meta charset="utf-8">\n'
        + '<body><style>* {font-family:sans-serif;}\n'
        + '.image-set {border-bottom: 1px solid black; padding:2em 0;}\n'
        + '.label {text-transform:uppercase; color:white; background:gray; margin:0 1em;}\n'
        + '.label.mismatch {color:white; background:red;}\n'
        + '.label.expected {color:white; background:green;}\n'
        + '.box {display:inline-block;}</style>'
        + '<h1>Expected Test Results with Actual Values</h1>';


    for (let i = 0; i < actuals.length; i++) {
        writeTestFile('./test/actual' + i + '.svg', actuals[i]);
        let match = expected[i] == actuals[i];
        if (match) {
            testFileContent += '<div class="image-set"><div class="box"><div class="label">Expected ' + (i+1) + '</div><img id="expect' + (i+1) + '" src="' + expected[i] + '"/></div>'
                + '<div class="box"><div class="label expected">Actual ' + (i+1) + ' is as expected</div><img id="actual' + (i+1) + '" src="' + actuals[i] + '"/></div></div>';
        } else {
            testFileContent += '<div class="image-set"><div class="box"><div class="label">Expected ' + (i+1) + '</div><img id="expect' + (i+1) + '" src="' + expected[i] + '"/></div>'
                + '<div class="box"><div class="label mismatch">Actual ' + (i+1) + ' has a mismatch</div><img id="actual' + (i+1) + '" src="' + actuals[i] + '"/></div></div>';

        }
    }
    testFileContent += '</body';
    writeTestFile('./test/stacked-area.html', testFileContent);

    //have a look at ./test/stacked-area.html to view the result
});
