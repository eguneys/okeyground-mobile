import util from './util';

const colors = {
  b: 'blue',
  r: 'red',
  g: 'green',
  l: 'black'
};

const numbers = {
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '10': 'ten',
  '11': 'eleven',
  '12': 'twelve',
  '13': 'thirteen'
};

function colorSeries(color) {
  var ps = [];
  for (var number in numbers) {
    ps.push(makePiece(color, number).key);
  }
  return ps;
};

const allSeries = (() => {
  var s = {};
  for (var color in colors) {
    s[colors[color]] = colorSeries(color);
  }
  return s;
})();

const seriesByColor = (color) => allSeries[color];

var rainbow = 'r1g1l1b1 r2g2l2b2 r3g3l3b3 r4g4l4b4 r13g13l13b13 r1g1l1b1';
var initial = 'r1r2 r3r4r5r6r7r8r9r10r11r12r13l1l2l3l4l5l6l7   g1g2  l3';
var initialMiddles = '20l3';
var initialDiscards = ' r2r3l1';
var initialOpenGroups = `r8l8b8
b1b2b3
b9b10b11b12
l13r13b13
r12b12g12
r7r8r9r10
g10g11g12
l6b6r6
l9l10l11
b7l7r7g7
r13l13b13g13
l10r10b10g10
l6r6g6
l1b1g1
/r1r1
g1g1
g2g2
g3g3
g4g4
g5g5
g6g6
g7g7
g8g8
g9g9
g10g10
g11g11
g12g12

`;

function readDigit(str) {
  var number1 = parseInt(str[0]);
  var number2 = parseInt(str[0] + str[1]);

  if (isNaN(number2)) {
    if (isNaN(number1)) {
      return {
        left: str.slice(1)
      };
    }
    return {
      number: number1,
      left: str.slice(1)
    };
  } else {
    return {
      number: number2,
      left: str.slice(2)
    };
  }
}

function readPiece(str) {
  var color = str[0];
  var digit1 = str[1];
  var digit2 = str[2];

  var parsed = 2;

  if (!colors[color]) {
    return {
      left: str.slice(1)
    };
  }

  if (numbers[digit1 + digit2]) {
    digit1 += digit2;
    parsed = 3;
  }

  return {
    piece: makePiece(color, digit1),
    left: str.slice(parsed)
  };
}

function readPieceGroup(str) {
  var res = [], current = [];

  var i = 0;

  while (str.length > 0) {
    var parsed = readPiece(str);

    if (parsed.piece) {
      current.push(parsed.piece);
    } else {
      if (current.length > 0) {
        res.push(current);
      }
      current = [];
    }
    str = parsed.left;
  }

  return res;
}

function readBoardPieceGroup(str) {
  var res = [];

  var i = 0;

  while (str.length > 0) {
    var parsed = readPiece(str);

    if (parsed.piece) {
      res[i] = parsed.piece;
    }
    i++;
    str = parsed.left;
  }

  return res;
}

function readBoard(pieces) {
  var res = {};

  pieces = readBoardPieceGroup(pieces);

  for (var i = 0; i < pieces.length; i++) {
    if (pieces[i]) {
      res[util.encodeKey(i * 2, 'b')] = pieces[i];
    }
  }

  return res;
}

function readDiscards(discards) {
  var res = {};

  discards = readBoardPieceGroup(discards);

  for (var i = 0; i < 4; i++) {
    res[util.discards[i]] = [];
    if (discards[i]) {
      res[util.discards[i]].push(discards[i]);
    }
  }

  return res;
}

function readOpenGroups(groups) {
  var [series, pairs] = groups.split('/');
  series = readPieceGroup(series);
  pairs = readPieceGroup(pairs);

  var layout = layoutOpens(series, pairs);

  return {
    series,
    pairs,
    layout,
    relayout: function(data) {
      data.opens.layout = layoutOpens(data.opens.series, data.opens.pairs);
    }
  };
}

function layoutOpens(series, pairs) {
  var layout = {};
  var groupMap = { series: {}, pairs: {} };

  var startColumn = [];
  var i, key, column;
  var row = 0;

  var c1, r1;

  for (i = 0; i < series.length; i++) {
    var serie = series[i];

    c1 = (startColumn[row] || 1) - 1;
    r1 = row;
    groupMap.series[util.miniPos2key([c1, r1])] = i;

    for (var j = 0; j<serie.length; j++) {
      column = startColumn[row] || 1;
      key = util.miniPos2key([column, row]);
      layout[key] = serie[j];
      startColumn[row] = column + 1;
    }

    startColumn[row]+=2;
    row++;
    if (row >= util.miniRows) {
      row = 0;
    }
  }

  startColumn = [];
  i = 0; j = 0; key = 0; column = 0;
  row = 0;

  for (i = 0; i < pairs.length; i++) {
    var pair = pairs[i];

    c1 = (startColumn[row] || util.miniColumns - 1) - 1;
    r1 = row;
    groupMap.pairs[util.miniPos2key([c1, r1])] = i;

    for (j = 0; j < pair.length; j++) {
      column = startColumn[row] || util.miniColumns - 1;
      key = util.miniPos2key([column, row]);
      layout[key] = pair[j];
      startColumn[row] = column - 1;
    }
    startColumn[row]-=1;
    row++;
    if (row >= util.miniRows) {
      row = 0;
    }
  }

  return { layout, groupMap };
}

function getOpenSerieFromPos(data, pos) {
  var { series, layout: { groupMap } } = data.opens;
  var [column, row] = pos;

  for (var key in groupMap.series) {
    var groupIndex = groupMap.series[key];
    var group = series[groupIndex];
    var [startColumn, startRow] = util.miniKey2pos(key);

    var index = column - startColumn;

    if (index < 0 || index > (group.length + 1) || row != startRow) continue;

    return [groupIndex, index];
  }
}

function getOpenPairFromPos(data, pos) {
  var { pairs, layout: { groupMap } } = data.opens;
  var [column, row] = pos;

  for (var key in groupMap.pairs) {
    var groupIndex = groupMap.pairs[key];
    var group = pairs[groupIndex];
    var [startColumn, startRow] = util.miniKey2pos(key);

    var index = column - startColumn;

    if (index < 0 || index > 1 || row != startRow) continue;

    return [groupIndex, index];
  }
}

function readMiddles(middles) {
  var res = {};
  var parsed = readDigit(middles);

  res[util.middleCount] = parsed.number;
  parsed = readPiece(parsed.left);
  res[util.gosterge] = parsed.piece;

  return res;
}

function read(fen) {
  fen = fen.split('/');

  return {
    pieces: readBoard(fen[0]),
    discards: readDiscards(fen[1]),
    opens: readOpenGroups([fen[2], fen[3]].join('/')),
    middles: readMiddles(fen[4])
  };
}

function makePiece(color, number) {
  return {
    color: colors[color],
    number: numbers[number],
    key: color + number
  };
};

module.exports = {
  initial: initial,
  rainbow: rainbow,
  read: read,
  readPiece: readPiece,
  readBoard: readBoard,
  initialMiddles: initialMiddles,
  initialDiscards: initialDiscards,
  initialOpenGroups: initialOpenGroups,
  readMiddles: readMiddles,
  readDiscards: readDiscards,
  readOpenGroups: readOpenGroups,
  layoutOpens: layoutOpens,
  seriesByColor: seriesByColor,
  colors: colors,
  getOpenSerieFromPos: getOpenSerieFromPos,
  getOpenPairFromPos: getOpenPairFromPos
};
