'use babel'

const fs = require('fs');
const stackedArea = require('stacked-area');
const moment = require('moment');
const NOW = '2018-09-11 12:00';
const NUMBER_OF_TEST_IMAGES = 12;
let actuals = [];
let expected = [];
let settings;


function makeTestSettings() {
    settings = {};
    let now = moment(NOW);
    settings.data = makeTestData();
    settings.svg = document.createElement('svg');
    settings.title = 'Testing the Stacked Area Chart';

    settings.fromDate = moment(now).subtract(8, 'days');
    settings.toDate = moment(now).add(3, 'days');

    return settings;
}

function makeTestData() {
    let testData = {};
    testData.keys = ['Lowest', 'Low', 'Medium', 'High', 'Highest'];
    let now = moment(NOW);
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

function makeArrayOfArraysTestData() {
    let testData = {};
    testData.keys = ['Lowest', 'Low', 'Medium', 'High', 'Highest'];
    let now = moment(NOW);
    testData.entries = [];
    testData.entries.push(
        [moment(now).subtract(8, 'days'), 1, 0, 4, 1, 2],
        [moment(now).subtract(7, 'days'), 1, 0, 4, 1, 2],
        [moment(now).subtract(6, 'days'), 2, 1, 6, 2, 3],
        [moment(now).subtract(5, 'days'), 0, 1, 3, 2, 1],
        [moment(now).subtract(4, 'days'), 2, 3, 6, 5, 2],
        [moment(now).subtract(3, 'days'), 0, 1, 3, 4, 1],
        [moment(now).subtract(2, 'days'), 1, 1, 2, 3, 1],
        [moment(now).subtract(1, 'days'), 0, 0, 1, 1, 0]
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
    for (let i = 0; i < count; i++) {
        try {
            expected.push(readTestFile(folder + '/expect' + i + '.svg'));
        } catch (e) {
            console.log(e);
        }
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
    settings.svg = document.createElement('div');

    expect(() => {
        diagram.draw()
    }).toThrow(/No svg/);
});

test('no data', () => {
    let settings = makeTestSettings();
    let diagram = stackedArea(settings);
    delete settings.data;
    expect(() => {
        diagram.draw()
    }).toThrow(/No data/);
});

test('no data entries', () => {
    let settings = makeTestSettings();
    delete settings.data.entries;
    let diagram = stackedArea(settings);
    expect(() => {
        diagram.draw()
    }).toThrow(/No data entries/);
});

test('empty data entries', () => {
    let settings = makeTestSettings();
    let diagram = stackedArea(settings);
    settings.data = {
        entries: []
    }
    expect(() => {
        diagram.draw()
    }).toThrow(/Empty data entries/);
});

test('data entries not an array', () => {
    let settings = makeTestSettings();
    let diagram = stackedArea(settings);
    settings.data.entries = {}
    expect(() => {
        diagram.draw()
    }).toThrow(/Data entries not an array/);
});

test('no keys defined', () => {
    let settings = makeTestSettings();
    let diagram = stackedArea(settings);
    delete settings.data.keys;
    expect(() => {
        diagram.draw();
    }).toThrow(/No keys defined/);
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
        .toBe(70);
    expect(settings.margin.bottom)
        .toBe(50);
    expect(settings.margin.left)
        .toBe(40);
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

test('set top margin', () => {
    let settings = makeTestSettings();
    let diagram = stackedArea(settings);
    settings.margin = { top: 10 };
    diagram.draw();
    expect(settings.margin.top)
        .toBe(10);
    expect(settings.margin.right)
        .toBe(70);
    expect(settings.margin.bottom)
        .toBe(50);
    expect(settings.margin.left)
        .toBe(40);
    expect(settings.innerWidth)
        .toBe(800 - settings.margin.left - settings.margin.right);
    expect(settings.innerHeight)
        .toBe(400 - settings.margin.top - settings.margin.bottom);
});

test('set right margin', () => {
    let settings = makeTestSettings();
    let diagram = stackedArea(settings);
    settings.margin = { right: 10 };
    diagram.draw();
    expect(settings.margin.top)
        .toBe(50);
    expect(settings.margin.right)
        .toBe(10);
    expect(settings.margin.bottom)
        .toBe(50);
    expect(settings.margin.left)
        .toBe(40);
    expect(settings.innerWidth)
        .toBe(800 - settings.margin.left - settings.margin.right);
    expect(settings.innerHeight)
        .toBe(400 - settings.margin.top - settings.margin.bottom);
});

test('set bottom margin', () => {
    let settings = makeTestSettings();
    let diagram = stackedArea(settings);
    settings.margin = { bottom: 10 };
    diagram.draw();
    expect(settings.margin.top)
        .toBe(50);
    expect(settings.margin.right)
        .toBe(70);
    expect(settings.margin.bottom)
        .toBe(10);
    expect(settings.margin.left)
        .toBe(40);
    expect(settings.innerWidth)
        .toBe(800 - settings.margin.left - settings.margin.right);
    expect(settings.innerHeight)
        .toBe(400 - settings.margin.top - settings.margin.bottom);
});

test('set left margin', () => {
    let settings = makeTestSettings();
    let diagram = stackedArea(settings);
    settings.margin = { left: 10 };
    diagram.draw();
    expect(settings.margin.top)
        .toBe(50);
    expect(settings.margin.right)
        .toBe(70);
    expect(settings.margin.bottom)
        .toBe(50);
    expect(settings.margin.left)
        .toBe(10);
    expect(settings.innerWidth)
        .toBe(800 - settings.margin.left - settings.margin.right);
    expect(settings.innerHeight)
        .toBe(400 - settings.margin.top - settings.margin.bottom);
});

test('set left and top margin to 0', () => {
    let settings = makeTestSettings();
    let diagram = stackedArea(settings);
    settings.margin = { left: 0, top: 0 };
    diagram.draw();
    expect(settings.margin.top)
        .toBe(0);
    expect(settings.margin.right)
        .toBe(70);
    expect(settings.margin.bottom)
        .toBe(50);
    expect(settings.margin.left)
        .toBe(0);
    expect(settings.innerWidth)
        .toBe(800 - settings.margin.left - settings.margin.right);
    expect(settings.innerHeight)
        .toBe(400 - settings.margin.top - settings.margin.bottom);
});


test('default style', () => {
    let settings = makeTestSettings();
    let diagram = stackedArea(settings);

    let color = '#222';
    let background = '#fff';
    diagram.draw();
    expect(settings.style.fontSize).toBe(12);
    expect(settings.style.fontFamily).toBe('sans-serif');
    expect(settings.style.color).toBe(color);
    expect(settings.style.backgroundColor).toBe(background);
    expect(settings.style.axis.color).toBe(color);
    expect(settings.style.markers.backgroundColor).toBe(background);
    expect(settings.style.markers.color).toBe(color);
});

test('stroke colors, empty axis color', () => {
    let settings = makeTestSettings();
    let diagram = stackedArea(settings);
    let color = '#222';
    let background = '#fff';

    settings.style = {};
    settings.style.markers = {
        backgroundColor: color
    };
    settings.style.axis = {};

    diagram.draw();
    expect(settings.style.fontSize).toBe(12);
    expect(settings.style.fontFamily).toBe('sans-serif');
    expect(settings.style.color).toBe(color);
    expect(settings.style.backgroundColor).toBe(background);
    expect(settings.style.axis.color).toBe(color);
    expect(settings.style.markers.backgroundColor).toBe(color);
    expect(settings.style.markers.color).toBe(color);
});

test('no draw options', () => {
    let settings = makeTestSettings();
    delete settings.drawOptions;
    let diagram = stackedArea(settings);
    diagram.draw();
    expect(settings.drawOptions).toEqual(['title', 'axis', 'legend', 'markers', 'focus']);
});


test('empty draw options', () => {
    let settings = makeTestSettings();
    settings.drawOptions = [];
    let diagram = stackedArea(settings);
    diagram.draw();
    expect(settings.drawOptions).toEqual([]);
});

test('title draw options', () => {
    let settings = makeTestSettings();
    settings.drawOptions = ['title'];
    let diagram = stackedArea(settings);
    diagram.draw();
    expect(settings.drawOptions).toEqual(['title']);
});

test('axis draw options', () => {
    let settings = makeTestSettings();
    settings.drawOptions = ['axis'];
    let diagram = stackedArea(settings);
    diagram.draw();
    expect(settings.drawOptions).toEqual(['axis']);
});

test('legend draw options', () => {
    let settings = makeTestSettings();
    settings.drawOptions = ['legend'];
    let diagram = stackedArea(settings);
    diagram.draw();
    expect(settings.drawOptions).toEqual(['legend']);
});

test('markers draw options', () => {
    let settings = makeTestSettings();
    settings.drawOptions = ['markers'];
    let diagram = stackedArea(settings);
    diagram.draw();
    expect(settings.drawOptions).toEqual(['markers']);
});



test('image 0 with default test data', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing Stacked Area';
    settings.markers = [
        { date: settings.fromDate },
        { date: settings.toDate }
    ];

    let diagram = stackedArea(settings);
    let actual = diagram.svgSource();
    actuals.push(actual);

    expect(actuals[0]).toBe(expected[0]);
});

test('image 1 with custom colors, no markers, no axis', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing Stacked Area with custom colors, no markers, no axis';
    settings.drawOptions = ['legend', 'title'];

    settings.markers = [
        { date: moment(settings.fromDate).add(1, 'days') },
        { date: moment(settings.toDate).subtract(1, 'days') }
    ];

    settings.style = {
        Highest: {
            color: 'chartreuse',
            stroke: 'white'
        },
        High: {
            color: 'cornflowerblue',
            stroke: 'white'
        },
        Medium: {
            color: 'darkorange',
            stroke: 'white'
        },
        Low: {
            color: 'firebrick',
            stroke: 'white'
        },
        Lowest: {
            color: 'purple',
            stroke: 'white'
        }
    }

    let diagram = stackedArea(settings);
    let actual = diagram.svgSource();
    actuals.push(actual);

    expect(actuals[1]).toBe(expected[1]);
});

test('image 2 with markers out of range', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing Stacked Area with markers out of range';
    settings.markers = [
        { date: moment(settings.fromDate).subtract(2, 'days') },
        { date: moment(settings.toDate).add(2, 'days') }
    ];

    let diagram = stackedArea(settings);
    let actual = diagram.svgSource();
    actuals.push(actual);

    expect(actuals[2]).toBe(expected[2]);
});

test('image 3 without fromDate and toDate', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing Stacked Area without fromDate and toDate';
    settings.markers = [
        { date: moment(settings.fromDate).subtract(2, 'days') },
        { date: moment(settings.toDate).add(2, 'days') }
    ];
    delete settings.fromDate;
    delete settings.toDate;


    let diagram = stackedArea(settings);
    let actual = diagram.svgSource();
    actuals.push(actual);

    expect(actuals[3]).toBe(expected[3]);
});

test('image 4 with legend title and no further draw options', () => {
    let settings = makeTestSettings();
    settings.drawOptions = ['legend'];
    settings.title = 'Testing Stacked Area with legend title and no further draw options';
    settings.legendTitle = 'Issues:';
    delete settings.fromDate;
    delete settings.toDate;

    let diagram = stackedArea(settings);
    let actual = diagram.svgSource();
    actuals.push(actual);

    expect(actuals[4]).toBe(expected[4]);
});

test('image 5 with curve step', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing Stacked Area with step curve';

    let diagram = stackedArea(settings);
    diagram.draw();
    expect(settings.curve.type).toEqual('linear');

    settings.curve.type = 'step';
    let actual = diagram.svgSource();
    actuals.push(actual);

    expect(actuals[5]).toBe(expected[5]);
});

test('image 6 with step curve and marker', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing Stacked Area with step curve and marker';
    settings.markers = [
        { date: moment(settings.fromDate).add(1, 'days') },
        { date: moment(settings.toDate).subtract(1, 'days') }
    ];

    let diagram = stackedArea(settings);
    diagram.draw();
    expect(settings.curve.type).toEqual('linear');

    settings.curve.type = 'step';
    let actual = diagram.svgSource();
    actuals.push(actual);

    expect(actuals[6]).toBe(expected[6]);
});

test('image 7 with curve cardinal and tension 0.5', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing Stacked Area curve cardinal and tension 0.5';
    settings.markers = [
        { date: moment(settings.fromDate).add(1, 'days') },
        { date: moment(settings.toDate).subtract(1, 'days') }
    ];
    settings.curve = {
        type: 'cardinal',
        tension: 0.5
    }

    let diagram = stackedArea(settings);
    diagram.draw();

    let actual = diagram.svgSource();
    actuals.push(actual);

    expect(actuals[7]).toBe(expected[7]);
});


test('image 8 with curve catmullRom and alpha 0.5', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing Stacked Area curve catmullRom and alpha 0.5';
    settings.markers = [
        { date: moment(settings.fromDate).add(1, 'days') },
        { date: moment(settings.toDate).subtract(1, 'days') }
    ];
    settings.curve = {
        type: 'catmullRom',
        alpha: 0.5
    }

    let diagram = stackedArea(settings);
    diagram.draw();

    let actual = diagram.svgSource();
    actuals.push(actual);

    expect(actuals[8]).toBe(expected[8]);
});

test('image 9 with data given as array of arrays', () => {
    let settings = makeTestSettings();
    settings.data = makeArrayOfArraysTestData();
    settings.title = 'Testing Stacked Area with array of array data entries';
    settings.markers = [
        { date: settings.fromDate },
        { date: settings.toDate }
    ];

    let diagram = stackedArea(settings);

    diagram.draw();

    let actual = diagram.svgSource();
    actuals.push(actual);

    expect(actuals[9]).toBe(expected[9]);
});

test('image 10 with reduced data and reduced legend', () => {
    let settings = makeTestSettings();
    settings.title = 'Testing Stacked Area with removed "Medium" data entries';
    settings.markers = [
        { date: settings.fromDate },
        { date: settings.toDate }
    ];

    for(let entry of settings.data.entries) {
        entry['Medium'] = 0;
    }

    let diagram = stackedArea(settings);
    let actual = diagram.svgSource();
    actuals.push(actual);

    expect(actuals[10]).toBe(expected[10]);
});


test('image 11 with reduced data and reduced legend in array organized entries', () => {
    let settings = makeTestSettings();
    settings.data = makeArrayOfArraysTestData();
    settings.title = 'Testing Stacked Area with removed "Medium" data in array organized entries';
    settings.markers = [
        { date: settings.fromDate },
        { date: settings.toDate }
    ];

    for(let entry of settings.data.entries) {
        entry[3] = 0;
    }

    let diagram = stackedArea(settings);

    diagram.draw();

    let actual = diagram.svgSource();
    actuals.push(actual);

    expect(actuals[11]).toBe(expected[11]);
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
            testFileContent += '<div class="image-set"><div class="box"><div class="label">Expected ' + i + '</div>' + expected[i] + '</div>'
                + '<div class="box"><div class="label expected">Actual ' + i + ' is as expected</div>' + actuals[i] + '</div></div>';
        } else {
            testFileContent += '<div class="image-set"><div class="box"><div class="label">Expected ' + i + '</div>' + expected[i] + '</div>'
                + '<div class="box"><div class="label mismatch">Actual ' + i + ' has a mismatch</div>' + actuals[i] + '</div></div>';

        }
    }
    testFileContent += '</body';
    writeTestFile('./test/stacked-area.html', testFileContent);

    //have a look at ./test/stacked-area.html to view the result
});
