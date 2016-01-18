(function() {

  //  存储浏览器中的window或者Nodejs中的global对象
  var root = this;

  // 存储"_",在"_"被占用,调用_.noConflict把underscore对象赋值给一个变量,类似于jQuery中的jQuery.noConflict
  var previousUnderscore = root._;

  // 内部变量
  var breaker = {};

  // 缓存Array/Object/Function的原型对象
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // 缓存Array/Object下的一些兼容方法
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // 缓存ES5中新增的Array/Object/Function的新增方法
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // 创建对象式的调用方式,将返回一个Underscore对象,包装器对象的原型中包含Underscore所有方法
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // 根据当前运行环境,决定暴露underscore对象的方式
  if (typeof exports !== 'undefined') {
    //  nodejs(commonJs)
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    //  AMD/CMD
    exports._ = _;
  } else {
    //  script引入
    root._ = _;
  }

  // 版本号
  _.VERSION = '1.5.2';

  // 对Array/Object进行遍历
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    //  obj为空
    
    //  数组类型
    if (nativeForEach && obj.forEach === nativeForEach) {

      //    当前运行环境支持[].forEach
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      //  当前运行环境不支持[].forEach,用迭代器做兼容
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      //  为Object类型,取得该对象的所有key,拼成数组,再用迭代器
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
  };

  // 对Array/Object进行遍历且对每项进行操作,并且返回数组
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    //  obj为空,返回空数组

    //    当前运行环境支持[].map
    if (nativeMap && obj.map === nativeMap){
       return obj.map(iterator, context);
    }

    //    当前运行环境不支持[].map或不是数组类型,用_.each处理每项
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  //  ES5中新增的reduce方法及别名
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {

    // 通过参数数量检查是否存在初始值
    var initial = arguments.length > 2;

    //  不处理空值
    if (obj == null) obj = [];

    //    当前运行环境支持[].reduce
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }

    //    当前运行环境不支持[].reduce,扔给each处理
    each(obj, function(value, index, list) {
      if (!initial) {
        // 如果没有初始值, 则将第一个元素作为初始值; 如果被处理的是对象集合, 则默认值为第一个属性的值
        memo = value;
        initial = true;
      } else {
        //  记录处理结果,扔给下一次迭代
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  //  ES5中新增的reduceRight方法及别名
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];

    //    当前运行环境支持[].reduceRight
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }

    //  处理对象类型
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }

    //    当前运行环境不支持[].reduceRight,扔给each处理
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // 返回通过验证的第一个元素
  _.find = _.detect = function(obj, iterator, context) {
    var result;

    //  any进行遍历
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        //  如果回调函数结果为真,则记录该值,并且终止循环

        result = value;
        return true;
      }
    });
    return result;
  };

  // ES5中新增的filter方法和别名
  _.filter = _.select = function(obj, iterator, context) {

    //  空数组记录结果集
    var results = [];

    //  不处理空对象
    if (obj == null) return results;

    //  当前运行环境支持[].filter方法
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);

    //  当前运行环境不支持[].filter方法,扔给each做循环
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)){
        //  回调函数中返回值为true
        
        results.push(value);
      }
    });
    return results;
  };

  // 和_.filter功能相反,取得不满足条件的集合
  _.reject = function(obj, iterator, context) {
    //  扔给_.filter
    return _.filter(obj, function(value, index, list) {

      //  回调函数返回值为false时,处理
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // ES5中新增的every和别名
  _.every = _.all = function(obj, iterator, context) {

    //  处理回调函数不存在的情况
    iterator || (iterator = _.identity);

    var result = true;

    //  不处理空值
    if (obj == null) return result;

    //  当前运行环境支持[].every
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);

    //  当前运行环境不支持[].every
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))){
        /**
         * 这边分两种情况:
         *   1.上次回调函数处理的结果为false,返回空对象
         *   2.上次回调函数处理的结果为true,再记录本次回调函数的处理结果,如果本次处理结果为false,返回空对象
         *   至于为什么加个if和返回一个空对象没搞懂
         *   个人认为if判断这边可以直接写成result = result && iterator.call(context, value, index, list)
         */
         return breaker;
      }
    });
    return !!result;
  };

  // ES5中新增的some方法和相关别名
  var any = _.some = _.any = function(obj, iterator, context) {

    //  回调函数为空的情况
    iterator || (iterator = _.identity);

    var result = false;

    //  不处理空对象
    if (obj == null) return result;

    //  当前运行环境支持[].some
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);

    //  当前运行环境不支持[].some
    each(obj, function(value, index, list) {
        /**
         * 这边分两种情况:
         *   1.上次回调函数处理的结果为true,返回空对象
         *   2.上次回调函数处理的结果为false,再记录本次回调函数的处理结果,如果本次处理结果为true,返回空对象
         *   至于为什么加个if和返回一个空对象没搞懂
         *   个人认为if判断这边可以直接写成result = result || iterator.call(context, value, index, list)
         *   和_.every类似,逻辑方面一个是与一个是或
         */
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // _.contains方法和别名
  _.contains = _.include = function(obj, target) {

    //  不处理空对象
    if (obj == null) return false;

    //  当前运行环境支持indexOf方法
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;

    //  当前运行环境不支持indexOf方法
    return any(obj, function(value) {
      return value === target;
    });
  };

  // 快速处理方法
  _.invoke = function(obj, method) {

    //  取所有参数的前面两个
    var args = slice.call(arguments, 2);

    //  判断第二个参数是否为Function类型
    var isFunc = _.isFunction(method);

    return _.map(obj, function(value) {

      // 依次调用每个元素的方法, 并将结果放入数组中返回
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // 取得一个对象集合中的指定key的值,并且拼成一个数组返回
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // 取得一个对象集合中的指定key的值且该key值对应的value等于指定的value,并且拼成一个数组返回
  _.where = function(obj, attrs, first) {

    //  指定的key:value为空
    if (_.isEmpty(attrs)) return first ? void 0 : [];

    //  根据第三个参数是否存在,判断调用哪个方法
    return _[first ? 'find' : 'filter'](obj, function(value) {

      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  //  取得一个对象集合中的指定key的值且该key值对应的value等于指定的value第一个值
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  //  取得最大值
  _.max = function(obj, iterator, context) {

    //  没有回调函数并且为数组且数组长度在65535(不知道为什么限制,最大长度为Math.pow(2,32) - 1),就用Math相关API来处理
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }

    //  空对象且回调函数不存在
    if (!iterator && _.isEmpty(obj)) return -Infinity;

    //  负无穷小
    var result = {computed : -Infinity, value: -Infinity};

    //  each循环计算
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;

      //  本次计算结果大于上次计算结果,记录本次计算结果
      computed > result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // 取得最小值
  _.min = function(obj, iterator, context) {

    //  没有回调函数并且为数组且数组长度在65535(不知道为什么限制,最大长度为Math.pow(2,32) - 1),就用Math相关API来处理
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }

    //  空对象且回调函数不存在
    if (!iterator && _.isEmpty(obj)) return Infinity;

    //  无穷大
    var result = {computed : Infinity, value: Infinity};

    //  each循环计算
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;

      //  本次计算结果小于上次计算结果,记录本次计算结果
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // 数组的无序排序
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {

      //  随机出本次插入的下标
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];

      //  数组中对应下标的位置赋值
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // 随机一个集合并且返回前n个元素
  _.sample = function(obj, n, guard) {

    //  n没有传
    if (n == null || guard) {

      //  第一个参数为对象类型,先取得所有属性对应的值并拼成一个数组
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }

    //  第一个参数为数组类型,随机该数组并且截取前n个元素
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  //  内部函数
  var lookupIterator = function(value) {

    /**
     * 这边value不是Function类型取obj[value]没搞懂
     */
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // 根据特定的条件排序
  _.sortBy = function(obj, value, context) {

    // val应该是对象的一个属性,或一个函数,如果是一个处理器,则应该返回需要进行比较的数据
    var iterator = lookupIterator(value);

    return _.pluck(_.map(obj, function(value, index, list) {

      //  先调用_.map遍历,存储比较的相关值
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      //  再根据比较的值排序

      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
    //  最后取得比较出来的value拼成一个数组返回

  };

  // 内部方法
  var group = function(behavior) {
    return function(obj, value, context) {

      var result = {};
      var iterator = value == null ? _.identity : lookupIterator(value);
      //  根据value的值,如果value不为空,则将处理器转换成函数,否则,将取得obj中value对应的值
      
      each(obj, function(value, index) {

        // 将处理器的返回值作为key,并将相同的key元素放到一个新的数组
        var key = iterator.call(context, value, index, obj);

        //  再传递给回调函数对result进行一些处理
        behavior(result, key, value);
      });
      return result;
    };
  };

  // 把一个对象集合根据条件组合
  _.groupBy = group(function(result, key, value) {

    //  往result[key]中追加新元素value
    (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
  });

  // 把一个对象集合根据条件索引
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  //  排序一个列表组成一个组,返回各组中的对象的数量的计数
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // 将obj插入已经排序的array中,返回obj在array中的索引号
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // 转换成数组
  _.toArray = function(obj) {
    if (!obj) return [];

    //  数组类型
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);

    //  对象类型
    return _.values(obj);
  };

  // 取得对象/数组的长度
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  //  取得数组的前n个元素
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;

    // 如果没有指定参数n, 则返回第一个元素
    // 如果指定了n, 则返回一个新的数组, 包含顺序指定数量n个元素
    // guard参数用于确定只返回第一个元素, 当guard为true时, 指定数量n无效
    return (n == null) || guard ? array[0] : slice.call(array, 0, n);
  };

  // 返回数组中除了最后一个元素外的其他全部元素
  _.initial = function(array, n, guard) {

    //  如果指定了n没有指定guard,返回除最后n个元素的前len - n个元素
    //  如果后两个参数都指定了,返回除最后一个元素外的所有元素
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // 取得数组的后1个或n个元素
  _.last = function(array, n, guard) {
    if (array == null) return void 0;

    //  如果n没有,且guard有,返回最后一个
    if ((n == null) || guard) {
      return array[array.length - 1];
    } else {
      //  否则返回前len - n个
      return slice.call(array, Math.max(array.length - n, 0));
    }
  };

  // 和_.initial功能相反,取得除第一个或前n个元素外的所有元素
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // 去除数组中所有false(null,false,"",0,NaN,undefined)的值
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {

      //  如果遍历的value还是个数组
      if (_.isArray(value) || _.isArguments(value)) {
        
        //  如果shallow为true,就把该value追加到结果数组
        //  否则继续递归    
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        //  递归到最底层

        output.push(value);
      }
    });
    return output;
  };

  // 递归多维数组,转换成一维或比原来少一层的数组
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // 返回一个删除所有values值的array副本
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // 数组去重
  _.uniq = _.unique = function(array, isSorted, iterator, context) {

    //  如果isSorted为Function,后面的参数前移一维,同时isSorted变成false
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }

    // 如果使用了iterator处理器, 则先将当前数组中的数据会先经过按迭代器处理, 并返回一个处理后的新数组
    var initial = iterator ? _.map(array, iterator, context) : array;

    var results = [];
    var seen = [];

    each(initial, function(value, index) {
      // 如果isSorted为true, 则直接使用===比较记录中的最后一个数据
      // 如果isSorted为false, 则使用_.contains方法与集合中的每一个数据进行对比
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // 取得多个数组的并集
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // 取得多个数组的交集
  _.intersection = function(array) {

    //  将参数转换为二维数组
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // 取得多个数组中不相同的元素
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // 合并多个数组中相同位置的元素为一个新数组
  _.zip = function() {

    //  取得传入的所有数组中最大长度
    var length = _.max(_.pluck(arguments, "length").concat(0));
    var results = new Array(length);

    //  依次循环,取得每个数组中相应位置的值,放在一个新数组,拼成一个二维数组,最后返回
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // 把数组转换成对象
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};

    //  循环遍历每一项
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        //  如果传入了第二个数组,取当前下标的元素做value
        result[list[i]] = values[i];
      } else {
        //  否则如果是字符串,就取该字符串中第一个字符做key,第二个字符做value
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // indexOf方法
  _.indexOf = function(array, item, isSorted) {
    
    //  空对象
    if (array == null) return -1;

    var i = 0, length = array.length;

    /**
     * 如果传递了isSorted
     *   1.isSorted为数字类型,修改起始遍历位置,缩小遍历范围
     *   2.将数组进行排序并且取得该元素排序后所在数组的位置
     */
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }

    //  当前运行环境支持[].indexOf方法
    // if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);

    //  当前运行环境不支持[].indexOf方法,开始遍历比较每项
    for (; i < length; i++){

      //  这边判断不是特别完善,不能判断Object类型,加入JSON.stringify()即可
      if (array[i] === item || (JSON.stringify(array[i]) === JSON.stringify(item))){
         return i;
      }
    }
    return -1;
  };

  // lastIndexOf方法,和indexOf类似,不做过多累述
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item || (JSON.stringify(array[i]) === JSON.stringify(item))) return i;
    return -1;
  };

  // 根据一个范围和步长,创建一个数组
  _.range = function(start, stop, step) {

    /**
     * 一个参数也没传,起始和结尾都是0
     * 只传了一个参数,起始位置为0,结束位置为传递的第一个参数
     */
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }

    //  不传递步长,默认为1
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    //  根据步长和循环次数拼数组
    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  var ctor = function(){};

  //  bind方法
  _.bind = function(func, context) {
    var args, bound;

    //  当前运行环境支持Function.prototype.bind
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));

    if (!_.isFunction(func)) throw new TypeError;

    args = slice.call(arguments, 2);
    return bound = function() {

      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // 和_.bind功能类似
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // 绑定一个对象上的所有方法到另一个对象
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");

    //  循环绑定
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // 存储计算结果
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // 定时器
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // 延迟执行一个方法,类似于setTimeout(func(),1);
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // 限制相关回调函数的执行时间,防止频繁调用操作引起的性能问题(高阶函数)
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;

    //  上次执行的时间点
    var previous = 0;
    options || (options = {});

    var later = function() {

      //  禁用第一次执行,上次执行的时间点为0,否则为当前时间戳
      previous = options.leading === false ? 0 : new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;

      // 首次执行时,如果设定了开始边界不执行选项,将上次执行时间设定为当前时间
      if (!previous && options.leading === false) previous = now;

      //  计算距离本次执行剩余时间
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;

      //  到指定时间间隔就执行本次
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);

      } else if (!timeout && options.trailing !== false) {
        //  禁用了最后一次执行且定时器不存在

        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // 空闲控制,函数连续调用时,空闲时间必须大于或等于间隔时间,回调函数才会执行(高阶函数)
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    return function() {
      context = this;
      args = arguments;
      timestamp = new Date();
      var later = function() {

        //  取得上次被调用的距离现在的时间差
        var last = (new Date()) - timestamp;

        //  上次被包装函数被调用时间间隔小于设定时间间隔
        if (last < wait) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;

          //  如果immediate为false,调用该方法
          if (!immediate) result = func.apply(context, args);
        }
      };

      //  如果immediate为true且timeout为空,立即调用
      var callNow = immediate && !timeout;

      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // 只执行一次方法
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;

      //  调用完func把func设置成null
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // 包装函数
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // 返回多个方法包装后的复合函数
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;

      //  对传入的函数依次进行包装
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // 返回一个函数的调用计数器,在该函数被调用多少次后执行
  _.after = function(times, func) {
    return function() {

      //  每次调用计数器就减1,当计数器小于1立即执行该函数
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  //  获取对象下的所有键值,类似于ES5的Object.keys
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];

    //  对该对象进行枚举,如果这个key对应的value存在,就把它追加到数组
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // 获取对象下的所有值,返回数组
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);

    //  根据获取的keys来遍历
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // 把对象下的每个键值对拆分成一个数组,最后返回一个多维数组
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);

    //  遍历所有的keys,拼数组
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // 将对象中的value转换成key,key转换成value
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {

      //  键值倒置
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // 如果对象中有key对应的value是一个Function类型,则将该属性值作为排序后的数组返回
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {

      //  该key对应的value是Fucntion
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // 拓展对象
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // 返回对象中指定key的value
  _.pick = function(obj) {
    var copy = {};

    //  取得传入的key(可能多个)
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // 过滤掉对象中的一些属性值
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // 合并多个对象,后面的对象将都被写到(相同key的情况复写)第一个对象中
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // 浅拷贝对象
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // 执行一个函数, 并将obj作为参数传递给该函数, 函数执行完毕后最终返回obj
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // 内部方法
  var eq = function(a, b, aStack, bStack) {

    // 获取第一个对象原型上的类名
    var className = toString.call(a);

    /**
     * 检查两个基本数据类型的值是否相等
     * 对于引用数据类型,如果它们来自同一个引用(同一个对象进行比较),则认为其相等
     * 需要注意的是0 === -0的结果为true,所以后面的1 / a 和 1  / b 是来判断0 和 -0 的情况(1 / -0 = -Infinity) != (1 / 0 = Infinity)
     */
    if (a === b) return a !== 0 || 1 / a == 1 / b;

    /**
     * 处理undefined 和 null的情况
     * undefined == null 的结果为true,而undefined === null 的结果为false
     */
    if (a == null || b == null) return a === b;
    
    /**
     * 两个对象都是underscore对象
     */
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;

    // 两个类名不同,直接返回false
    if (className != toString.call(b)) return false;

    switch (className) {
      case '[object String]':

        /**
         * 为什么一开始写成return a == String(b)没搞懂
         * toString.call("str") == "[object String]" -> true
         * toString.call(String("str")) == "[object String]" -> true
         * toString.call(new String("str")) == "[object String]" -> true
         * 所以String(b)如果只是为了把b再换成string类型的话,("" + b)性能更好
         */
        return a == ("" + b);
      case '[object Number]':

        /**
         * +a 会把 a转换成一个数字,如果转换结果和原来不同则被认为NaN
         * NaN != NaN,因此当a和b同时为NaN时,无法简单地使用a == b进行匹配,用相同的方法检查b是否为NaN(即 b != +b)
         * 和刚进方法体一样,判断0和-0的情况
         */
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        
        /**
         * 把bool和date类型转换成对应的数字来比较
         * +true -> 1 / +false -> 0 / +(new Date()) -> (new Date()).getTime()
         */
        return +a == +b;
      case '[object RegExp]':

        //  匹配正则表达式的相关属性是否相同(元字符串/全局匹配/多行模式/忽略大小写)
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }

    //  处理数组类型或对象类型(typeof [] = typeof {} = "object")
    if (typeof a != 'object' || typeof b != 'object') return false;

    //  在isEqual方法中传递的是空数组
    //  在方法体内部,判断的会再次进行传递被操作后的a堆和b堆
    var length = aStack.length;

    while (length--) {
      // 如果堆中的某个对象与数据a匹配,则再判断另一个堆中相同位置的对象是否等于第二个对象
      if (aStack[length] == a) return bStack[length] == b;
    }

    // 获取两个对象的构造器
    var aCtor = a.constructor, bCtor = b.constructor;

    //  判断两个对象如果不是不是同一个类的实例则认为不相等
    if (aCtor !== bCtor && 
      !(_.isFunction(aCtor) && 
      (aCtor instanceof aCtor) &&
      _.isFunction(bCtor) && 
      (bCtor instanceof bCtor))) {
      return false;
    }

    // 把a和b分别放到a堆和b堆中
    aStack.push(a);
    bStack.push(b);

    //  局部变量
    var size = 0, result = true;

    // 数组类型比较
    if (className == '[object Array]') {
      size = a.length;

      //  比较两个数组的长度是否相等
      result = size == b.length;

      //  如果长度相同,再依次比较数组的每项
      if (result) {
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {

      // 如果是对象类型,枚举第一个对象,判断b和a中的每个属性值是否相同,记录a中属性值的个数
      for (var key in a) {
        if (_.has(a, key)) {
          size++;
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }

      /**
       * 如果a中有的属性b中都有
       * 再枚举b对象,判断长度,如果b中属性值的长度大于size则result为false(!1 = false / !0 = true)
       * 个人认为下面的if判断也可以写成下面的样子
       * if(result) {
       *   result = result && (size == _.keys(b).length)
       * }
       */
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }

        // 当对象b中的属性多于对象a, 则认为两个对象不相等
        result = !size;
      }
    }

    // 删除堆中的数据,防止再进行迭代,返回比较结果
    aStack.pop();
    bStack.pop();
    return result;
  };

  // 比较两个对象是否相同
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // 判断一个对象是否为空
  _.isEmpty = function(obj) {

    //  空对象
    if (obj == null) return true;

    //  Array
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;

    //  Object
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  /**
   * 判断是否为一个HTML元素
   * 常见的nodeType:
   * element -> 1
   * attr -> 2
   * text -> 3
   * comment -> 8
   * document -> 9
   */
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // 用原型判断是否为一个数组
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // 判断是否为一个对象
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // 往 _ 对象上添加isArguments, isFunction, isString, isNumber, isDate, isRegExp方法
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // _.isArguments的兼容写法
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // 
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // 判断一个无穷数
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // 判断是否为一个非数字
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // 布尔值
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // null
  _.isNull = function(obj) {
    return obj === null;
  };

  // undefined
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // 判断一个对象中是否含有某个属性值
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // 防止 _ 被占用的方法,类似于jQuery中noConflict,可以用另外一个符号替换 _
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // 将一个数据的获取方式转换为函数获取方式,在Underscore里被用作默认的迭代器iterator
  _.identity = function(value) {
    return value;
  };

  // 将传入的函数执行n次
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // 获取一个范围内的随机数
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // HTML特殊符号转义
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };

  //  将刚才定义的转义对象的key-value互换位置
  entityMap.unescape = _.invert(entityMap.escape);

  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  //  转义和反转
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // 如果对象 object 中的属性 property 是函数,则调用它,否则,返回它对应的value
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // 拓展underscore对象
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // 模板中的一些标签匹配正则
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  var noMatch = /(.)^/;

  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // underscore模板
  _.template = function(text, data, settings) {
    var render;

    //  获取传入的参数并且合并成一个对象
    settings = _.defaults({}, settings, _.templateSettings);

    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // 编译模板,转换成可执行源码
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  _.chain = function(obj) {
    return _(obj).chain();
  };

  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // 往underscore对象上添加定义的所有方法(属性方法)
  _.mixin(_);

  // 一些数组的方法
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  //  添加underscore原型方法
  _.extend(_.prototype, {

    //  链式调用,返回当前调用对象 _
    chain: function() {
      this._chain = true;
      return this;
    },

    //  返回包装对象
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);