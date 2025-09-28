/*
 * chess.js - Chess move generator and validation
 * Copyright (c) 2023, Jeff Hlywa (jhlywa@gmail.com)
 * Released under the MIT license
 * https://github.com/jhlywa/chess.js
 */

(function() {
  var Chess = function(fen) {
    var BLACK = 'b';
    var WHITE = 'w';

    var EMPTY = -1;

    var PAWN = 'p';
    var KNIGHT = 'n';
    var BISHOP = 'b';
    var ROOK = 'r';
    var QUEEN = 'q';
    var KING = 'k';

    var SYMBOLS = 'pnbrqkPNBRQK';

    var DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    var MOVE_OFFSETS = {
      n: [-18, -33, -31, -14, 18, 33, 31, 14],
      b: [-17, -15, 17, 15],
      r: [-16, 1, 16, -1],
      q: [-17, -16, -15, 1, 17, 16, 15, -1],
      k: [-17, -16, -15, 1, 17, 16, 15, -1]
    };

    var PAWN_OFFSETS = {
      b: [16, 32, 17, 15],
      w: [-16, -32, -17, -15]
    };

    var PIECE_MASK = 0x7;
    var COLOR_MASK = 0x8;

    var PROMOTIONS = [QUEEN, ROOK, BISHOP, KNIGHT];

    var RANK_1 = 7;
    var RANK_2 = 6;
    var RANK_7 = 1;
    var RANK_8 = 0;

    var SIDES = { w: 0, b: 1 };

    var board = new Array(128);
    var kings = { w: EMPTY, b: EMPTY };
    var turn = WHITE;
    var castling = { w: 0, b: 0 };
    var ep_square = EMPTY;
    var half_moves = 0;
    var move_number = 1;
    var history = [];
    var header = {};

    if (typeof fen === 'undefined') {
      load(DEFAULT_POSITION);
    } else {
      load(fen);
    }

    function clear() {
      board = new Array(128);
      for (var i = 0; i < 128; i++) {
        board[i] = null;
      }
      kings = { w: EMPTY, b: EMPTY };
      turn = WHITE;
      castling = { w: 0, b: 0 };
      ep_square = EMPTY;
      half_moves = 0;
      move_number = 1;
      history = [];
      header = {};
    }

    function load(fen) {
      var tokens = fen.split(/\s+/);
      var position = tokens[0];
      var square = 0;

      clear();

      for (var i = 0; i < position.length; i++) {
        var piece = position.charAt(i);

        if (piece === '/') {
          square += 8;
        } else if (is_digit(piece)) {
          square += parseInt(piece, 10);
        } else {
          var color = piece < 'a' ? WHITE : BLACK;
          put({ type: piece.toLowerCase(), color: color }, algebraic(square));
          square += 1;
        }
      }

      turn = tokens[1];

      if (tokens[2].indexOf('K') > -1) {
        castling.w |= BITS.KSIDE_CASTLE;
      }
      if (tokens[2].indexOf('Q') > -1) {
        castling.w |= BITS.QSIDE_CASTLE;
      }
      if (tokens[2].indexOf('k') > -1) {
        castling.b |= BITS.KSIDE_CASTLE;
      }
      if (tokens[2].indexOf('q') > -1) {
        castling.b |= BITS.QSIDE_CASTLE;
      }

      ep_square = tokens[3] === '-' ? EMPTY : SQUARES[tokens[3]];
      half_moves = parseInt(tokens[4], 10);
      move_number = parseInt(tokens[5], 10);

      return true;
    }

    function reset() {
      load(DEFAULT_POSITION);
    }

    function is_digit(c) {
      return '0123456789'.indexOf(c) !== -1;
    }

    function algebraic(i) {
      var file = i & 15;
      var rank = 8 - (i >> 4);
      return 'abcdefgh'.substring(file, file + 1) + rank;
    }

    function put(piece, square) {
      if (!('type' in piece && 'color' in piece)) {
        return false;
      }

      if (SYMBOLS.indexOf(piece.type.toLowerCase()) === -1) {
        return false;
      }

      if (!(square in SQUARES)) {
        return false;
      }

      var sq = SQUARES[square];
      board[sq] = { type: piece.type, color: piece.color };
      if (piece.type === KING) {
        kings[piece.color] = sq;
      }

      return true;
    }

    function get(square) {
      if (!(square in SQUARES)) {
        return null;
      }

      return board[SQUARES[square]];
    }

    function remove(square) {
      var piece = get(square);
      board[SQUARES[square]] = null;
      if (piece && piece.type === KING) {
        kings[piece.color] = EMPTY;
      }
      return piece;
    }

    function build_move(board, from, to, flags, promotion) {
      var move = {
        color: turn,
        from: from,
        to: to,
        flags: flags,
        piece: board[from].type
      };

      if (promotion) {
        move.flags |= BITS.PROMOTION;
        move.promotion = promotion;
      }

      if (board[to]) {
        move.captured = board[to].type;
      } else if (flags & BITS.EP_CAPTURE) {
        move.captured = PAWN;
      }

      return move;
    }

    var BITS = {
      NORMAL: 1,
      CAPTURE: 2,
      BIG_PAWN: 4,
      EP_CAPTURE: 8,
      PROMOTION: 16,
      KSIDE_CASTLE: 32,
      QSIDE_CASTLE: 64
    };

    var ROOKS = {
      w: [
        { square: SQUARES.a1, flag: BITS.QSIDE_CASTLE },
        { square: SQUARES.h1, flag: BITS.KSIDE_CASTLE }
      ],
      b: [
        { square: SQUARES.a8, flag: BITS.QSIDE_CASTLE },
        { square: SQUARES.h8, flag: BITS.KSIDE_CASTLE }
      ]
    };

    var SQUARES = {
      a8: 0, b8: 1, c8: 2, d8: 3, e8: 4, f8: 5, g8: 6, h8: 7,
      a7: 16, b7: 17, c7: 18, d7: 19, e7: 20, f7: 21, g7: 22, h7: 23,
      a6: 32, b6: 33, c6: 34, d6: 35, e6: 36, f6: 37, g6: 38, h6: 39,
      a5: 48, b5: 49, c5: 50, d5: 51, e5: 52, f5: 53, g5: 54, h5: 55,
      a4: 64, b4: 65, c4: 66, d4: 67, e4: 68, f4: 69, g4: 70, h4: 71,
      a3: 80, b3: 81, c3: 82, d3: 83, e3: 84, f3: 85, g3: 86, h3: 87,
      a2: 96, b2: 97, c2: 98, d2: 99, e2: 100, f2: 101, g2: 102, h2: 103,
      a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
    };

    var FLAGS = {
      NORMAL: 'n',
      CAPTURE: 'c',
      BIG_PAWN: 'b',
      EP_CAPTURE: 'e',
      PROMOTION: 'p',
      KSIDE_CASTLE: 'k',
      QSIDE_CASTLE: 'q'
    };

    function moves(options) {
      var moves = [];
      var us = turn;
      var them = swap_color(us);
      var second_rank = { b: RANK_7, w: RANK_2 };
      var first_sq = SQUARES.a8;
      var last_sq = SQUARES.h1;
      var single_square = false;
      var legal = typeof options !== 'undefined' && 'legal' in options ? options.legal : true;
      var piece_type = 'piece' in options ? options.piece : null;
      var squares = 'square' in options ? [options.square] : board;

      if ('square' in options) {
        single_square = true;
      }

      for (var i = first_sq; i <= last_sq; i++) {
        if (i & 0x88) {
          i += 7;
          continue;
        }

        if (board[i] == null || board[i].color !== us) {
          continue;
        }

        if (piece_type && piece_type !== board[i].type) {
          continue;
        }

        var piece = board[i];

        if (piece.type === PAWN) {
          var square = i + PAWN_OFFSETS[us][0];

          if (!board[square]) {
            add_move(moves, i, square, BITS.NORMAL);
            var second_square = i + PAWN_OFFSETS[us][1];
            if (second_rank[us] === rank(i) && !board[second_square]) {
              add_move(moves, i, second_square, BITS.BIG_PAWN);
            }
          }

          for (var j = 2; j < 4; j++) {
            var square = i + PAWN_OFFSETS[us][j];
            if (square & 0x88) continue;

            if (board[square] && board[square].color === them) {
              add_move(moves, i, square, BITS.CAPTURE);
            } else if (square === ep_square) {
              add_move(moves, i, ep_square, BITS.EP_CAPTURE);
            }
          }
        } else {
          for (var j = 0, len = MOVE_OFFSETS[piece.type].length; j < len; j++) {
            var offset = MOVE_OFFSETS[piece.type][j];
            var square = i;

            while (true) {
              square += offset;
              if (square & 0x88) break;

              if (board[square]) {
                if (board[square].color === us) break;
                add_move(moves, i, square, BITS.CAPTURE);
                break;
              } else {
                add_move(moves, i, square, BITS.NORMAL);
              }

              if (piece.type === KNIGHT || piece.type === KING) break;
            }
          }
        }
      }

      /* castling */
      if (!single_square || piece_type === KING) {
        var king_side = castling[us] & BITS.KSIDE_CASTLE;
        var queen_side = castling[us] & BITS.QSIDE_CASTLE;

        if (king_side) {
          var castling_from = kings[us];
          var castling_to = castling_from + 2;

          if (!board[castling_from + 1] && !board[castling_to]) {
            if (!attacked(them, kings[us]) && !attacked(them, castling_from + 1) && !attacked(them, castling_to)) {
              add_move(moves, kings[us], castling_to, BITS.KSIDE_CASTLE);
            }
          }
        }

        if (queen_side) {
          var castling_from = kings[us];
          var castling_to = castling_from - 2;

          if (!board[castling_from - 1] && !board[castling_from - 2] && !board[castling_from - 3]) {
            if (!attacked(them, kings[us]) && !attacked(them, castling_from - 1) && !attacked(them, castling_to)) {
              add_move(moves, kings[us], castling_to, BITS.QSIDE_CASTLE);
            }
          }
        }
      }

      if (!legal) {
        return moves;
      }

      var legal_moves = [];
      for (var i = 0, len = moves.length; i < len; i++) {
        make_move(moves[i]);
        if (!king_attacked(us)) {
          legal_moves.push(moves[i]);
        }
        undo_move();
      }

      return legal_moves;
    }

    function attacked(color, square) {
      for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
        if (i & 0x88) { i += 7; continue; }
        if (board[i] == null || board[i].color !== color) continue;

        var piece = board[i];
        var difference = i - square;
        var index = difference + 119;

        if (ATTACKS[index] & (1 << PIECE_TYPES[piece.type])) {
          if (piece.type === PAWN) {
            if (difference > 0) {
              if (piece.color === WHITE) return true;
            } else {
              if (piece.color === BLACK) return true;
            }
            continue;
          }

          if (piece.type === KNIGHT || piece.type === KING) {
            return true;
          }

          var offset = RAYS[index];
          var j = i + offset;
          var blocked = false;
          while (j !== square) {
            if (board[j] != null) {
              blocked = true;
              break;
            }
            j += offset;
          }

          if (!blocked) {
            return true;
          }
        }
      }

      return false;
    }

    function king_attacked(color) {
      return attacked(swap_color(color), kings[color]);
    }

    function in_check() {
      return king_attacked(turn);
    }

    function in_checkmate() {
      return in_check() && moves().length === 0;
    }

    function in_stalemate() {
      return !in_check() && moves().length === 0;
    }

    function insufficient_material() {
      var pieces = {};
      var bishops = [];
      var num_pieces = 0;
      var sq_color = 0;

      for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
        if (i & 0x88) { i += 7; continue; }

        var piece = board[i];
        if (piece) {
          pieces[piece.type] = (piece.type in pieces) ? pieces[piece.type] + 1 : 1;
          if (piece.type === BISHOP) {
            bishops.push(square_color(i));
          }
          num_pieces++;
        }
      }

      if (num_pieces === 2) {
        return true;
      } else if (num_pieces === 3 && (pieces[BISHOP] === 1 || pieces[KNIGHT] === 1)) {
        return true;
      } else if (num_pieces === pieces[BISHOP] + 2) {
        var sum = 0;
        var len = bishops.length;
        for (var i = 0; i < len; i++) {
          sum += bishops[i];
        }
        if (sum === 0 || sum === len) {
          return true;
        }
      }

      return false;
    }

    function in_threefold_repetition() {
      var moves = []; var positions = {};
      var repetition = false;

      while (history.length > 0) {
        var move = undo_move();
        moves.push(move);
      }

      while (moves.length > 0) {
        var move = moves.pop();
        var fen = generate_fen();

        positions[fen] = (fen in positions) ? positions[fen] + 1 : 1;
        if (positions[fen] >= 3) {
          repetition = true;
        }
        make_move(move);
      }

      return repetition;
    }

    function push(move) {
      history.push({ move: move, kings: { b: kings.b, w: kings.w }, turn: turn, castling: { b: castling.b, w: castling.w }, ep_square: ep_square, half_moves: half_moves, move_number: move_number });
    }

    function make_move(move) {
      var us = turn;
      var them = swap_color(us);
      push(move);

      board[move.to] = board[move.from];
      board[move.from] = null;

      if (move.flags & BITS.EP_CAPTURE) {
        var capture_square = move.to + (us === WHITE ? 16 : -16);
        board[capture_square] = null;
      }

      if (move.flags & BITS.PROMOTION) {
        board[move.to] = { type: move.promotion, color: us };
      }

      if (board[move.to].type === KING) {
        kings[board[move.to].color] = move.to;
        if (move.flags & BITS.KSIDE_CASTLE) {
          var castling_to = move.to - 1;
          var castling_from = move.to + 1;
          board[castling_to] = board[castling_from];
          board[castling_from] = null;
        } else if (move.flags & BITS.QSIDE_CASTLE) {
          var castling_to = move.to + 1;
          var castling_from = move.to - 2;
          board[castling_to] = board[castling_from];
          board[castling_from] = null;
        }

        castling[us] = 0;
      }

      if (move.flags & BITS.BIG_PAWN) {
        ep_square = move.to + (us === WHITE ? 16 : -16);
      } else {
        ep_square = EMPTY;
      }

      if (move.captured) {
        half_moves = 0;
      } else if (board[move.to].type === PAWN) {
        half_moves = 0;
      } else {
        half_moves++;
      }

      if (us === BLACK) {
        move_number++;
      }

      turn = them;
    }

    function undo_move() {
      var old = history.pop();
      if (old == null) {
        return null;
      }

      var move = old.move;
      kings = old.kings;
      turn = old.turn;
      castling = old.castling;
      ep_square = old.ep_square;
      half_moves = old.half_moves;
      move_number = old.move_number;

      board[move.from] = board[move.to];
      board[move.from].type = move.piece;
      board[move.to] = null;

      if (move.captured) {
        if (move.flags & BITS.EP_CAPTURE) {
          var capture_square = move.to + (turn === WHITE ? 16 : -16);
          board[capture_square] = { type: PAWN, color: swap_color(turn) };
        } else {
          board[move.to] = { type: move.captured, color: swap_color(turn) };
        }
      }

      if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
        var castling_to, castling_from;
        if (move.flags & BITS.KSIDE_CASTLE) {
          castling_to = move.to + 1;
          castling_from = move.to - 1;
        } else {
          castling_to = move.to - 2;
          castling_from = move.to + 1;
        }

        board[castling_to] = board[castling_from];
        board[castling_from] = null;
      }

      return move;
    }

    function add_move(moves, from, to, flags) {
      if (board[from].type === PAWN && (rank(to) === RANK_8 || rank(to) === RANK_1)) {
        for (var i = 0; i < PROMOTIONS.length; i++) {
          moves.push(build_move(board, from, to, flags, PROMOTIONS[i]));
        }
      } else {
        moves.push(build_move(board, from, to, flags));
      }
    }

    function rank(i) {
      return i >> 4;
    }

    function square_color(square) {
      return (rank(square) + (square & 15)) % 2;
    }

    function swap_color(c) {
      return c === WHITE ? BLACK : WHITE;
    }

    function generate_fen() {
      var empty = 0;
      var fen = '';

      for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
        if (board[i] == null) {
          empty++;
        } else {
          if (empty > 0) {
            fen += empty;
            empty = 0;
          }
          var piece = board[i].type;
          fen += board[i].color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
        }

        if ((i + 1) & 0x88) {
          if (empty > 0) {
            fen += empty;
          }

          fen += '/';
          empty = 0;
          i += 8;
        }
      }

      fen = fen.slice(0, -1);
      var cflags = '';

      if (castling.w & BITS.KSIDE_CASTLE) { cflags += 'K'; }
      if (castling.w & BITS.QSIDE_CASTLE) { cflags += 'Q'; }
      if (castling.b & BITS.KSIDE_CASTLE) { cflags += 'k'; }
      if (castling.b & BITS.QSIDE_CASTLE) { cflags += 'q'; }

      cflags = cflags || '-';
      var epflags = ep_square === EMPTY ? '-' : algebraic(ep_square);

      return [fen, turn, cflags, epflags, half_moves, move_number].join(' ');
    }

    function ascii() {
      var s = '   +------------------------+\n';
      for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
        if ((i & 15) === 0) {
          s += ' ' + '87654321'[i >> 4] + ' |';
        }

        if (board[i] == null) {
          s += ' . ';
        } else {
          var piece = board[i].type;
          var color = board[i].color;
          var symbol = color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
          s += ' ' + symbol + ' ';
        }

        if ((i + 1) & 0x88) {
          s += '|\n';
          i += 8;
        }
      }
      s += '   +------------------------+\n';
      s += '     a  b  c  d  e  f  g  h\n';

      return s;
    }

    function move_to_san(move, moves) {
      var output = '';

      if (move.flags & BITS.KSIDE_CASTLE) {
        output = 'O-O';
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        output = 'O-O-O';
      } else {
        if (move.piece !== PAWN) {
          output += move.piece.toUpperCase();
        }

        var disambiguator = get_disambiguator(move, moves);
        output += disambiguator;

        if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
          if (move.piece === PAWN) {
            output += move.from[0];
          }
          output += 'x';
        }

        output += move.to;

        if (move.flags & BITS.PROMOTION) {
          output += '=' + move.promotion.toUpperCase();
        }
      }

      make_move(move);
      if (in_check()) {
        if (in_checkmate()) {
          output += '#';
        } else {
          output += '+';
        }
      }
      undo_move();

      return output;
    }

    function get_disambiguator(move, moves) {
      var from = move.from;
      var to = move.to;
      var piece = move.piece;

      var ambiguities = 0;
      var same_rank = 0;
      var same_file = 0;

      for (var i = 0, len = moves.length; i < len; i++) {
        var ambig_from = moves[i].from;
        var ambig_to = moves[i].to;
        var ambig_piece = moves[i].piece;

        if (piece === ambig_piece && from !== ambig_from && to === ambig_to) {
          ambiguities++;
          if (rank(from) === rank(ambig_from)) {
            same_rank++;
          }
          if ((from & 15) === (ambig_from & 15)) {
            same_file++;
          }
        }
      }

      if (ambiguities > 0) {
        if (same_rank > 0 && same_file > 0) {
          return algebraic(from);
        } else if (same_file > 0) {
          return algebraic(from).charAt(1);
        } else {
          return algebraic(from).charAt(0);
        }
      }

      return '';
    }

    function move_to_uci(move) {
      var uci = move.from + move.to;
      if (move.flags & BITS.PROMOTION) {
        uci += move.promotion;
      }
      return uci;
    }

    function san_to_move(move, sloppy) {
      var moves = moves({ legal: true });
      for (var i = 0, len = moves.length; i < len; i++) {
        if (sloppy) {
          if (move.toLowerCase() === move_to_uci(moves[i])) {
            return moves[i];
          }
        } else {
          if (move === move_to_san(moves[i], moves)) {
            return moves[i];
          }
        }
      }

      return null;
    }

    function make_pretty(ugly_move) {
      var move = clone_move(ugly_move);
      move.san = move_to_san(move, moves({ legal: true }));
      move.to = algebraic(move.to);
      move.from = algebraic(move.from);
      var flags = '';
      for (var flag in BITS) {
        if (BITS[flag] & move.flags) {
          flags += FLAGS[flag];
        }
      }
      move.flags = flags;
      return move;
    }

    function clone_move(move) {
      var cloned = {};
      for (var prop in move) {
        if (move.hasOwnProperty(prop)) {
          cloned[prop] = move[prop];
        }
      }
      return cloned;
    }

    function perft(depth) {
      var moves = moves({ legal: true });
      var nodes = 0;
      var color = turn;

      for (var i = 0, len = moves.length; i < len; i++) {
        make_move(moves[i]);
        if (!king_attacked(color)) {
          if (depth - 1 > 0) {
            var child_nodes = perft(depth - 1);
            nodes += child_nodes;
          } else {
            nodes++;
          }
        }
        undo_move();
      }

      return nodes;
    }

    var ATTACKS = new Uint8Array([
      20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]);

    var RAYS = new Int8Array([
      17, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]);

    var PIECE_TYPES = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };

    for (var i = 0; i < 0x78; i++) {
      if (i & 0x88) { i += 7; continue; }

      var attacks = 0;
      var ray = 0;

      for (var j = 0; j < MOVE_OFFSETS.n.length; j++) {
        var square = i + MOVE_OFFSETS.n[j];
        if (!(square & 0x88)) {
          attacks |= (1 << PIECE_TYPES[KNIGHT]);
        }
      }

      for (var j = 0; j < MOVE_OFFSETS.b.length; j++) {
        var square = i + MOVE_OFFSETS.b[j];
        if (!(square & 0x88)) {
          attacks |= (1 << PIECE_TYPES[BISHOP]);
          ray = MOVE_OFFSETS.b[j];
        }
      }

      for (var j = 0; j < MOVE_OFFSETS.r.length; j++) {
        var square = i + MOVE_OFFSETS.r[j];
        if (!(square & 0x88)) {
          attacks |= (1 << PIECE_TYPES[ROOK]);
          ray = MOVE_OFFSETS.r[j];
        }
      }

      for (var j = 0; j < MOVE_OFFSETS.q.length; j++) {
        var square = i + MOVE_OFFSETS.q[j];
        if (!(square & 0x88)) {
          attacks |= (1 << PIECE_TYPES[QUEEN]);
          ray = MOVE_OFFSETS.q[j];
        }
      }

      for (var j = 0; j < MOVE_OFFSETS.k.length; j++) {
        var square = i + MOVE_OFFSETS.k[j];
        if (!(square & 0x88)) {
          attacks |= (1 << PIECE_TYPES[KING]);
          ray = MOVE_OFFSETS.k[j];
        }
      }

      ATTACKS[i + 119] = attacks;
      RAYS[i + 119] = ray;
    }

    return {
      load: function(fen) {
        if (!load(fen)) {
          throw new Error('Invalid FEN');
        }
      },
      reset: reset,
      moves: function(options) {
        return moves(options).map(make_pretty);
      },
      in_check: in_check,
      in_checkmate: in_checkmate,
      in_stalemate: in_stalemate,
      insufficient_material: insufficient_material,
      in_threefold_repetition: in_threefold_repetition,
      history: function(options) {
        var past = [];
        var reversed = [];
        var move_history = history;
        while (history.length > 0) {
          reversed.push(undo_move());
        }
        while (reversed.length > 0) {
          var move = reversed.pop();
          if (!options || (options.verbose)) {
            past.push(make_pretty(move));
          } else {
            past.push(move_to_san(move, moves()));
          }
          make_move(move);
        }
        return past;
      },
      get: get,
      put: put,
      remove: remove,
      ascii: ascii,
      turn: function() { return turn; },
      fen: generate_fen,
      board: function() {
        var output = [];
        var row = [];
        for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
          if (board[i] == null) {
            row.push(null);
          } else {
            row.push({ type: board[i].type, color: board[i].color });
          }
          if ((i + 1) & 0x88) {
            output.push(row);
            row = [];
            i += 8;
          }
        }
        return output;
      },
      validate_fen: function(fen) {
        return { valid: load(fen) };
      },
      game_over: function() {
        return in_checkmate() || in_stalemate() || insufficient_material() || in_threefold_repetition();
      },
      move: function(move, options) {
        var sloppy = typeof options !== 'undefined' && 'sloppy' in options ? options.sloppy : false;
        var legal = moves({ legal: true });

        var move_obj = null;
        if (typeof move === 'string') {
          move_obj = san_to_move(move, sloppy);
        } else if ('from' in move && 'to' in move) {
          var moves_from = moves({ square: move.from, legal: true });
          for (var i = 0, len = moves_from.length; i < len; i++) {
            if (move.to === moves_from[i].to) {
              move_obj = moves_from[i];
              break;
            }
          }
        }

        if (!move_obj) {
          return null;
        }

        make_move(move_obj);
        return make_pretty(move_obj);
      },
      undo: function() {
        var move = undo_move();
        return move ? make_pretty(move) : null;
      },
      perft: perft
    };
  };

  if (typeof exports !== 'undefined') exports.Chess = Chess;
  if (typeof define !== 'undefined' && define.amd) define(function() { return Chess; });
  if (typeof window !== 'undefined') window.Chess = Chess;
})();
