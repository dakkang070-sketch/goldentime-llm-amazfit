(function() {
    const i = document.createElement("link").relList;
    if (i && i.supports && i.supports("modulepreload")) return;
    for (const f of document.querySelectorAll('link[rel="modulepreload"]')) r(f);
    new MutationObserver(f => {
        for (const d of f)
            if (d.type === "childList")
                for (const m of d.addedNodes) m.tagName === "LINK" && m.rel === "modulepreload" && r(m)
    }).observe(document, {
        childList: !0,
        subtree: !0
    });

    function l(f) {
        const d = {};
        return f.integrity && (d.integrity = f.integrity), f.referrerPolicy && (d.referrerPolicy = f.referrerPolicy), f.crossOrigin === "use-credentials" ? d.credentials = "include" : f.crossOrigin === "anonymous" ? d.credentials = "omit" : d.credentials = "same-origin", d
    }

    function r(f) {
        if (f.ep) return;
        f.ep = !0;
        const d = l(f);
        fetch(f.href, d)
    }
})();
var Uu = {
        exports: {}
    },
    hl = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Qp;

function U1() {
    if (Qp) return hl;
    Qp = 1;
    var a = Symbol.for("react.transitional.element"),
        i = Symbol.for("react.fragment");

    function l(r, f, d) {
        var m = null;
        if (d !== void 0 && (m = "" + d), f.key !== void 0 && (m = "" + f.key), "key" in f) {
            d = {};
            for (var h in f) h !== "key" && (d[h] = f[h])
        } else d = f;
        return f = d.ref, {
            $$typeof: a,
            type: r,
            key: m,
            ref: f !== void 0 ? f : null,
            props: d
        }
    }
    return hl.Fragment = i, hl.jsx = l, hl.jsxs = l, hl
}
var Pp;

function H1() {
    return Pp || (Pp = 1, Uu.exports = U1()), Uu.exports
}
var u = H1(),
    Hu = {
        exports: {}
    },
    Oe = {};
/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Fp;

function G1() {
    if (Fp) return Oe;
    Fp = 1;
    var a = Symbol.for("react.transitional.element"),
        i = Symbol.for("react.portal"),
        l = Symbol.for("react.fragment"),
        r = Symbol.for("react.strict_mode"),
        f = Symbol.for("react.profiler"),
        d = Symbol.for("react.consumer"),
        m = Symbol.for("react.context"),
        h = Symbol.for("react.forward_ref"),
        x = Symbol.for("react.suspense"),
        y = Symbol.for("react.memo"),
        g = Symbol.for("react.lazy"),
        b = Symbol.for("react.activity"),
        S = Symbol.iterator;

    function j(T) {
        return T === null || typeof T != "object" ? null : (T = S && T[S] || T["@@iterator"], typeof T == "function" ? T : null)
    }
    var A = {
            isMounted: function() {
                return !1
            },
            enqueueForceUpdate: function() {},
            enqueueReplaceState: function() {},
            enqueueSetState: function() {}
        },
        G = Object.assign,
        Y = {};

    function U(T, X, K) {
        this.props = T, this.context = X, this.refs = Y, this.updater = K || A
    }
    U.prototype.isReactComponent = {}, U.prototype.setState = function(T, X) {
        if (typeof T != "object" && typeof T != "function" && T != null) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
        this.updater.enqueueSetState(this, T, X, "setState")
    }, U.prototype.forceUpdate = function(T) {
        this.updater.enqueueForceUpdate(this, T, "forceUpdate")
    };

    function I() {}
    I.prototype = U.prototype;

    function P(T, X, K) {
        this.props = T, this.context = X, this.refs = Y, this.updater = K || A
    }
    var W = P.prototype = new I;
    W.constructor = P, G(W, U.prototype), W.isPureReactComponent = !0;
    var se = Array.isArray;

    function he() {}
    var $ = {
            H: null,
            A: null,
            T: null,
            S: null
        },
        ne = Object.prototype.hasOwnProperty;

    function ce(T, X, K) {
        var re = K.ref;
        return {
            $$typeof: a,
            type: T,
            key: X,
            ref: re !== void 0 ? re : null,
            props: K
        }
    }

    function te(T, X) {
        return ce(T.type, X, T.props)
    }

    function Me(T) {
        return typeof T == "object" && T !== null && T.$$typeof === a
    }

    function Se(T) {
        var X = {
            "=": "=0",
            ":": "=2"
        };
        return "$" + T.replace(/[=:]/g, function(K) {
            return X[K]
        })
    }
    var Fe = /\/+/g;

    function ze(T, X) {
        return typeof T == "object" && T !== null && T.key != null ? Se("" + T.key) : X.toString(36)
    }

    function Ae(T) {
        switch (T.status) {
            case "fulfilled":
                return T.value;
            case "rejected":
                throw T.reason;
            default:
                switch (typeof T.status == "string" ? T.then(he, he) : (T.status = "pending", T.then(function(X) {
                        T.status === "pending" && (T.status = "fulfilled", T.value = X)
                    }, function(X) {
                        T.status === "pending" && (T.status = "rejected", T.reason = X)
                    })), T.status) {
                    case "fulfilled":
                        return T.value;
                    case "rejected":
                        throw T.reason
                }
        }
        throw T
    }

    function O(T, X, K, re, ye) {
        var Te = typeof T;
        (Te === "undefined" || Te === "boolean") && (T = null);
        var we = !1;
        if (T === null) we = !0;
        else switch (Te) {
            case "bigint":
            case "string":
            case "number":
                we = !0;
                break;
            case "object":
                switch (T.$$typeof) {
                    case a:
                    case i:
                        we = !0;
                        break;
                    case g:
                        return we = T._init, O(we(T._payload), X, K, re, ye)
                }
        }
        if (we) return ye = ye(T), we = re === "" ? "." + ze(T, 0) : re, se(ye) ? (K = "", we != null && (K = we.replace(Fe, "$&/") + "/"), O(ye, X, K, "", function(yt) {
            return yt
        })) : ye != null && (Me(ye) && (ye = te(ye, K + (ye.key == null || T && T.key === ye.key ? "" : ("" + ye.key).replace(Fe, "$&/") + "/") + we)), X.push(ye)), 1;
        we = 0;
        var Le = re === "" ? "." : re + ":";
        if (se(T))
            for (var Ee = 0; Ee < T.length; Ee++) re = T[Ee], Te = Le + ze(re, Ee), we += O(re, X, K, Te, ye);
        else if (Ee = j(T), typeof Ee == "function")
            for (T = Ee.call(T), Ee = 0; !(re = T.next()).done;) re = re.value, Te = Le + ze(re, Ee++), we += O(re, X, K, Te, ye);
        else if (Te === "object") {
            if (typeof T.then == "function") return O(Ae(T), X, K, re, ye);
            throw X = String(T), Error("Objects are not valid as a React child (found: " + (X === "[object Object]" ? "object with keys {" + Object.keys(T).join(", ") + "}" : X) + "). If you meant to render a collection of children, use an array instead.")
        }
        return we
    }

    function E(T, X, K) {
        if (T == null) return T;
        var re = [],
            ye = 0;
        return O(T, re, "", "", function(Te) {
            return X.call(K, Te, ye++)
        }), re
    }

    function ae(T) {
        if (T._status === -1) {
            var X = T._result;
            X = X(), X.then(function(K) {
                (T._status === 0 || T._status === -1) && (T._status = 1, T._result = K)
            }, function(K) {
                (T._status === 0 || T._status === -1) && (T._status = 2, T._result = K)
            }), T._status === -1 && (T._status = 0, T._result = X)
        }
        if (T._status === 1) return T._result.default;
        throw T._result
    }
    var ge = typeof reportError == "function" ? reportError : function(T) {
            if (typeof window == "object" && typeof window.ErrorEvent == "function") {
                var X = new window.ErrorEvent("error", {
                    bubbles: !0,
                    cancelable: !0,
                    message: typeof T == "object" && T !== null && typeof T.message == "string" ? String(T.message) : String(T),
                    error: T
                });
                if (!window.dispatchEvent(X)) return
            } else if (typeof process == "object" && typeof process.emit == "function") {
                process.emit("uncaughtException", T);
                return
            }
            console.error(T)
        },
        Ne = {
            map: E,
            forEach: function(T, X, K) {
                E(T, function() {
                    X.apply(this, arguments)
                }, K)
            },
            count: function(T) {
                var X = 0;
                return E(T, function() {
                    X++
                }), X
            },
            toArray: function(T) {
                return E(T, function(X) {
                    return X
                }) || []
            },
            only: function(T) {
                if (!Me(T)) throw Error("React.Children.only expected to receive a single React element child.");
                return T
            }
        };
    return Oe.Activity = b, Oe.Children = Ne, Oe.Component = U, Oe.Fragment = l, Oe.Profiler = f, Oe.PureComponent = P, Oe.StrictMode = r, Oe.Suspense = x, Oe.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = $, Oe.__COMPILER_RUNTIME = {
        __proto__: null,
        c: function(T) {
            return $.H.useMemoCache(T)
        }
    }, Oe.cache = function(T) {
        return function() {
            return T.apply(null, arguments)
        }
    }, Oe.cacheSignal = function() {
        return null
    }, Oe.cloneElement = function(T, X, K) {
        if (T == null) throw Error("The argument must be a React element, but you passed " + T + ".");
        var re = G({}, T.props),
            ye = T.key;
        if (X != null)
            for (Te in X.key !== void 0 && (ye = "" + X.key), X) !ne.call(X, Te) || Te === "key" || Te === "__self" || Te === "__source" || Te === "ref" && X.ref === void 0 || (re[Te] = X[Te]);
        var Te = arguments.length - 2;
        if (Te === 1) re.children = K;
        else if (1 < Te) {
            for (var we = Array(Te), Le = 0; Le < Te; Le++) we[Le] = arguments[Le + 2];
            re.children = we
        }
        return ce(T.type, ye, re)
    }, Oe.createContext = function(T) {
        return T = {
            $$typeof: m,
            _currentValue: T,
            _currentValue2: T,
            _threadCount: 0,
            Provider: null,
            Consumer: null
        }, T.Provider = T, T.Consumer = {
            $$typeof: d,
            _context: T
        }, T
    }, Oe.createElement = function(T, X, K) {
        var re, ye = {},
            Te = null;
        if (X != null)
            for (re in X.key !== void 0 && (Te = "" + X.key), X) ne.call(X, re) && re !== "key" && re !== "__self" && re !== "__source" && (ye[re] = X[re]);
        var we = arguments.length - 2;
        if (we === 1) ye.children = K;
        else if (1 < we) {
            for (var Le = Array(we), Ee = 0; Ee < we; Ee++) Le[Ee] = arguments[Ee + 2];
            ye.children = Le
        }
        if (T && T.defaultProps)
            for (re in we = T.defaultProps, we) ye[re] === void 0 && (ye[re] = we[re]);
        return ce(T, Te, ye)
    }, Oe.createRef = function() {
        return {
            current: null
        }
    }, Oe.forwardRef = function(T) {
        return {
            $$typeof: h,
            render: T
        }
    }, Oe.isValidElement = Me, Oe.lazy = function(T) {
        return {
            $$typeof: g,
            _payload: {
                _status: -1,
                _result: T
            },
            _init: ae
        }
    }, Oe.memo = function(T, X) {
        return {
            $$typeof: y,
            type: T,
            compare: X === void 0 ? null : X
        }
    }, Oe.startTransition = function(T) {
        var X = $.T,
            K = {};
        $.T = K;
        try {
            var re = T(),
                ye = $.S;
            ye !== null && ye(K, re), typeof re == "object" && re !== null && typeof re.then == "function" && re.then(he, ge)
        } catch (Te) {
            ge(Te)
        } finally {
            X !== null && K.types !== null && (X.types = K.types), $.T = X
        }
    }, Oe.unstable_useCacheRefresh = function() {
        return $.H.useCacheRefresh()
    }, Oe.use = function(T) {
        return $.H.use(T)
    }, Oe.useActionState = function(T, X, K) {
        return $.H.useActionState(T, X, K)
    }, Oe.useCallback = function(T, X) {
        return $.H.useCallback(T, X)
    }, Oe.useContext = function(T) {
        return $.H.useContext(T)
    }, Oe.useDebugValue = function() {}, Oe.useDeferredValue = function(T, X) {
        return $.H.useDeferredValue(T, X)
    }, Oe.useEffect = function(T, X) {
        return $.H.useEffect(T, X)
    }, Oe.useEffectEvent = function(T) {
        return $.H.useEffectEvent(T)
    }, Oe.useId = function() {
        return $.H.useId()
    }, Oe.useImperativeHandle = function(T, X, K) {
        return $.H.useImperativeHandle(T, X, K)
    }, Oe.useInsertionEffect = function(T, X) {
        return $.H.useInsertionEffect(T, X)
    }, Oe.useLayoutEffect = function(T, X) {
        return $.H.useLayoutEffect(T, X)
    }, Oe.useMemo = function(T, X) {
        return $.H.useMemo(T, X)
    }, Oe.useOptimistic = function(T, X) {
        return $.H.useOptimistic(T, X)
    }, Oe.useReducer = function(T, X, K) {
        return $.H.useReducer(T, X, K)
    }, Oe.useRef = function(T) {
        return $.H.useRef(T)
    }, Oe.useState = function(T) {
        return $.H.useState(T)
    }, Oe.useSyncExternalStore = function(T, X, K) {
        return $.H.useSyncExternalStore(T, X, K)
    }, Oe.useTransition = function() {
        return $.H.useTransition()
    }, Oe.version = "19.2.4", Oe
}
var Jp;

function Uf() {
    return Jp || (Jp = 1, Hu.exports = G1()), Hu.exports
}
var M = Uf(),
    Gu = {
        exports: {}
    },
    pl = {},
    Yu = {
        exports: {}
    },
    qu = {};
/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var $p;

function Y1() {
    return $p || ($p = 1, (function(a) {
        function i(O, E) {
            var ae = O.length;
            O.push(E);
            e: for (; 0 < ae;) {
                var ge = ae - 1 >>> 1,
                    Ne = O[ge];
                if (0 < f(Ne, E)) O[ge] = E, O[ae] = Ne, ae = ge;
                else break e
            }
        }

        function l(O) {
            return O.length === 0 ? null : O[0]
        }

        function r(O) {
            if (O.length === 0) return null;
            var E = O[0],
                ae = O.pop();
            if (ae !== E) {
                O[0] = ae;
                e: for (var ge = 0, Ne = O.length, T = Ne >>> 1; ge < T;) {
                    var X = 2 * (ge + 1) - 1,
                        K = O[X],
                        re = X + 1,
                        ye = O[re];
                    if (0 > f(K, ae)) re < Ne && 0 > f(ye, K) ? (O[ge] = ye, O[re] = ae, ge = re) : (O[ge] = K, O[X] = ae, ge = X);
                    else if (re < Ne && 0 > f(ye, ae)) O[ge] = ye, O[re] = ae, ge = re;
                    else break e
                }
            }
            return E
        }

        function f(O, E) {
            var ae = O.sortIndex - E.sortIndex;
            return ae !== 0 ? ae : O.id - E.id
        }
        if (a.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
            var d = performance;
            a.unstable_now = function() {
                return d.now()
            }
        } else {
            var m = Date,
                h = m.now();
            a.unstable_now = function() {
                return m.now() - h
            }
        }
        var x = [],
            y = [],
            g = 1,
            b = null,
            S = 3,
            j = !1,
            A = !1,
            G = !1,
            Y = !1,
            U = typeof setTimeout == "function" ? setTimeout : null,
            I = typeof clearTimeout == "function" ? clearTimeout : null,
            P = typeof setImmediate < "u" ? setImmediate : null;

        function W(O) {
            for (var E = l(y); E !== null;) {
                if (E.callback === null) r(y);
                else if (E.startTime <= O) r(y), E.sortIndex = E.expirationTime, i(x, E);
                else break;
                E = l(y)
            }
        }

        function se(O) {
            if (G = !1, W(O), !A)
                if (l(x) !== null) A = !0, he || (he = !0, Se());
                else {
                    var E = l(y);
                    E !== null && Ae(se, E.startTime - O)
                }
        }
        var he = !1,
            $ = -1,
            ne = 5,
            ce = -1;

        function te() {
            return Y ? !0 : !(a.unstable_now() - ce < ne)
        }

        function Me() {
            if (Y = !1, he) {
                var O = a.unstable_now();
                ce = O;
                var E = !0;
                try {
                    e: {
                        A = !1,
                        G && (G = !1, I($), $ = -1),
                        j = !0;
                        var ae = S;
                        try {
                            t: {
                                for (W(O), b = l(x); b !== null && !(b.expirationTime > O && te());) {
                                    var ge = b.callback;
                                    if (typeof ge == "function") {
                                        b.callback = null, S = b.priorityLevel;
                                        var Ne = ge(b.expirationTime <= O);
                                        if (O = a.unstable_now(), typeof Ne == "function") {
                                            b.callback = Ne, W(O), E = !0;
                                            break t
                                        }
                                        b === l(x) && r(x), W(O)
                                    } else r(x);
                                    b = l(x)
                                }
                                if (b !== null) E = !0;
                                else {
                                    var T = l(y);
                                    T !== null && Ae(se, T.startTime - O), E = !1
                                }
                            }
                            break e
                        }
                        finally {
                            b = null, S = ae, j = !1
                        }
                        E = void 0
                    }
                }
                finally {
                    E ? Se() : he = !1
                }
            }
        }
        var Se;
        if (typeof P == "function") Se = function() {
            P(Me)
        };
        else if (typeof MessageChannel < "u") {
            var Fe = new MessageChannel,
                ze = Fe.port2;
            Fe.port1.onmessage = Me, Se = function() {
                ze.postMessage(null)
            }
        } else Se = function() {
            U(Me, 0)
        };

        function Ae(O, E) {
            $ = U(function() {
                O(a.unstable_now())
            }, E)
        }
        a.unstable_IdlePriority = 5, a.unstable_ImmediatePriority = 1, a.unstable_LowPriority = 4, a.unstable_NormalPriority = 3, a.unstable_Profiling = null, a.unstable_UserBlockingPriority = 2, a.unstable_cancelCallback = function(O) {
            O.callback = null
        }, a.unstable_forceFrameRate = function(O) {
            0 > O || 125 < O ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : ne = 0 < O ? Math.floor(1e3 / O) : 5
        }, a.unstable_getCurrentPriorityLevel = function() {
            return S
        }, a.unstable_next = function(O) {
            switch (S) {
                case 1:
                case 2:
                case 3:
                    var E = 3;
                    break;
                default:
                    E = S
            }
            var ae = S;
            S = E;
            try {
                return O()
            } finally {
                S = ae
            }
        }, a.unstable_requestPaint = function() {
            Y = !0
        }, a.unstable_runWithPriority = function(O, E) {
            switch (O) {
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                    break;
                default:
                    O = 3
            }
            var ae = S;
            S = O;
            try {
                return E()
            } finally {
                S = ae
            }
        }, a.unstable_scheduleCallback = function(O, E, ae) {
            var ge = a.unstable_now();
            switch (typeof ae == "object" && ae !== null ? (ae = ae.delay, ae = typeof ae == "number" && 0 < ae ? ge + ae : ge) : ae = ge, O) {
                case 1:
                    var Ne = -1;
                    break;
                case 2:
                    Ne = 250;
                    break;
                case 5:
                    Ne = 1073741823;
                    break;
                case 4:
                    Ne = 1e4;
                    break;
                default:
                    Ne = 5e3
            }
            return Ne = ae + Ne, O = {
                id: g++,
                callback: E,
                priorityLevel: O,
                startTime: ae,
                expirationTime: Ne,
                sortIndex: -1
            }, ae > ge ? (O.sortIndex = ae, i(y, O), l(x) === null && O === l(y) && (G ? (I($), $ = -1) : G = !0, Ae(se, ae - ge))) : (O.sortIndex = Ne, i(x, O), A || j || (A = !0, he || (he = !0, Se()))), O
        }, a.unstable_shouldYield = te, a.unstable_wrapCallback = function(O) {
            var E = S;
            return function() {
                var ae = S;
                S = E;
                try {
                    return O.apply(this, arguments)
                } finally {
                    S = ae
                }
            }
        }
    })(qu)), qu
}
var Ip;

function q1() {
    return Ip || (Ip = 1, Yu.exports = Y1()), Yu.exports
}
var ku = {
        exports: {}
    },
    nn = {};
/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Wp;

function k1() {
    if (Wp) return nn;
    Wp = 1;
    var a = Uf();

    function i(x) {
        var y = "https://react.dev/errors/" + x;
        if (1 < arguments.length) {
            y += "?args[]=" + encodeURIComponent(arguments[1]);
            for (var g = 2; g < arguments.length; g++) y += "&args[]=" + encodeURIComponent(arguments[g])
        }
        return "Minified React error #" + x + "; visit " + y + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
    }

    function l() {}
    var r = {
            d: {
                f: l,
                r: function() {
                    throw Error(i(522))
                },
                D: l,
                C: l,
                L: l,
                m: l,
                X: l,
                S: l,
                M: l
            },
            p: 0,
            findDOMNode: null
        },
        f = Symbol.for("react.portal");

    function d(x, y, g) {
        var b = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
        return {
            $$typeof: f,
            key: b == null ? null : "" + b,
            children: x,
            containerInfo: y,
            implementation: g
        }
    }
    var m = a.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

    function h(x, y) {
        if (x === "font") return "";
        if (typeof y == "string") return y === "use-credentials" ? y : ""
    }
    return nn.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = r, nn.createPortal = function(x, y) {
        var g = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
        if (!y || y.nodeType !== 1 && y.nodeType !== 9 && y.nodeType !== 11) throw Error(i(299));
        return d(x, y, null, g)
    }, nn.flushSync = function(x) {
        var y = m.T,
            g = r.p;
        try {
            if (m.T = null, r.p = 2, x) return x()
        } finally {
            m.T = y, r.p = g, r.d.f()
        }
    }, nn.preconnect = function(x, y) {
        typeof x == "string" && (y ? (y = y.crossOrigin, y = typeof y == "string" ? y === "use-credentials" ? y : "" : void 0) : y = null, r.d.C(x, y))
    }, nn.prefetchDNS = function(x) {
        typeof x == "string" && r.d.D(x)
    }, nn.preinit = function(x, y) {
        if (typeof x == "string" && y && typeof y.as == "string") {
            var g = y.as,
                b = h(g, y.crossOrigin),
                S = typeof y.integrity == "string" ? y.integrity : void 0,
                j = typeof y.fetchPriority == "string" ? y.fetchPriority : void 0;
            g === "style" ? r.d.S(x, typeof y.precedence == "string" ? y.precedence : void 0, {
                crossOrigin: b,
                integrity: S,
                fetchPriority: j
            }) : g === "script" && r.d.X(x, {
                crossOrigin: b,
                integrity: S,
                fetchPriority: j,
                nonce: typeof y.nonce == "string" ? y.nonce : void 0
            })
        }
    }, nn.preinitModule = function(x, y) {
        if (typeof x == "string")
            if (typeof y == "object" && y !== null) {
                if (y.as == null || y.as === "script") {
                    var g = h(y.as, y.crossOrigin);
                    r.d.M(x, {
                        crossOrigin: g,
                        integrity: typeof y.integrity == "string" ? y.integrity : void 0,
                        nonce: typeof y.nonce == "string" ? y.nonce : void 0
                    })
                }
            } else y == null && r.d.M(x)
    }, nn.preload = function(x, y) {
        if (typeof x == "string" && typeof y == "object" && y !== null && typeof y.as == "string") {
            var g = y.as,
                b = h(g, y.crossOrigin);
            r.d.L(x, g, {
                crossOrigin: b,
                integrity: typeof y.integrity == "string" ? y.integrity : void 0,
                nonce: typeof y.nonce == "string" ? y.nonce : void 0,
                type: typeof y.type == "string" ? y.type : void 0,
                fetchPriority: typeof y.fetchPriority == "string" ? y.fetchPriority : void 0,
                referrerPolicy: typeof y.referrerPolicy == "string" ? y.referrerPolicy : void 0,
                imageSrcSet: typeof y.imageSrcSet == "string" ? y.imageSrcSet : void 0,
                imageSizes: typeof y.imageSizes == "string" ? y.imageSizes : void 0,
                media: typeof y.media == "string" ? y.media : void 0
            })
        }
    }, nn.preloadModule = function(x, y) {
        if (typeof x == "string")
            if (y) {
                var g = h(y.as, y.crossOrigin);
                r.d.m(x, {
                    as: typeof y.as == "string" && y.as !== "script" ? y.as : void 0,
                    crossOrigin: g,
                    integrity: typeof y.integrity == "string" ? y.integrity : void 0
                })
            } else r.d.m(x)
    }, nn.requestFormReset = function(x) {
        r.d.r(x)
    }, nn.unstable_batchedUpdates = function(x, y) {
        return x(y)
    }, nn.useFormState = function(x, y, g) {
        return m.H.useFormState(x, y, g)
    }, nn.useFormStatus = function() {
        return m.H.useHostTransitionStatus()
    }, nn.version = "19.2.4", nn
}
var eg;

function X1() {
    if (eg) return ku.exports;
    eg = 1;

    function a() {
        if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function")) try {
            __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(a)
        } catch (i) {
            console.error(i)
        }
    }
    return a(), ku.exports = k1(), ku.exports
}
/**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var tg;

function K1() {
    if (tg) return pl;
    tg = 1;
    var a = q1(),
        i = Uf(),
        l = X1();

    function r(e) {
        var t = "https://react.dev/errors/" + e;
        if (1 < arguments.length) {
            t += "?args[]=" + encodeURIComponent(arguments[1]);
            for (var n = 2; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n])
        }
        return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
    }

    function f(e) {
        return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11)
    }

    function d(e) {
        var t = e,
            n = e;
        if (e.alternate)
            for (; t.return;) t = t.return;
        else {
            e = t;
            do t = e, (t.flags & 4098) !== 0 && (n = t.return), e = t.return; while (e)
        }
        return t.tag === 3 ? n : null
    }

    function m(e) {
        if (e.tag === 13) {
            var t = e.memoizedState;
            if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated
        }
        return null
    }

    function h(e) {
        if (e.tag === 31) {
            var t = e.memoizedState;
            if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated
        }
        return null
    }

    function x(e) {
        if (d(e) !== e) throw Error(r(188))
    }

    function y(e) {
        var t = e.alternate;
        if (!t) {
            if (t = d(e), t === null) throw Error(r(188));
            return t !== e ? null : e
        }
        for (var n = e, s = t;;) {
            var o = n.return;
            if (o === null) break;
            var c = o.alternate;
            if (c === null) {
                if (s = o.return, s !== null) {
                    n = s;
                    continue
                }
                break
            }
            if (o.child === c.child) {
                for (c = o.child; c;) {
                    if (c === n) return x(o), e;
                    if (c === s) return x(o), t;
                    c = c.sibling
                }
                throw Error(r(188))
            }
            if (n.return !== s.return) n = o, s = c;
            else {
                for (var p = !1, v = o.child; v;) {
                    if (v === n) {
                        p = !0, n = o, s = c;
                        break
                    }
                    if (v === s) {
                        p = !0, s = o, n = c;
                        break
                    }
                    v = v.sibling
                }
                if (!p) {
                    for (v = c.child; v;) {
                        if (v === n) {
                            p = !0, n = c, s = o;
                            break
                        }
                        if (v === s) {
                            p = !0, s = c, n = o;
                            break
                        }
                        v = v.sibling
                    }
                    if (!p) throw Error(r(189))
                }
            }
            if (n.alternate !== s) throw Error(r(190))
        }
        if (n.tag !== 3) throw Error(r(188));
        return n.stateNode.current === n ? e : t
    }

    function g(e) {
        var t = e.tag;
        if (t === 5 || t === 26 || t === 27 || t === 6) return e;
        for (e = e.child; e !== null;) {
            if (t = g(e), t !== null) return t;
            e = e.sibling
        }
        return null
    }
    var b = Object.assign,
        S = Symbol.for("react.element"),
        j = Symbol.for("react.transitional.element"),
        A = Symbol.for("react.portal"),
        G = Symbol.for("react.fragment"),
        Y = Symbol.for("react.strict_mode"),
        U = Symbol.for("react.profiler"),
        I = Symbol.for("react.consumer"),
        P = Symbol.for("react.context"),
        W = Symbol.for("react.forward_ref"),
        se = Symbol.for("react.suspense"),
        he = Symbol.for("react.suspense_list"),
        $ = Symbol.for("react.memo"),
        ne = Symbol.for("react.lazy"),
        ce = Symbol.for("react.activity"),
        te = Symbol.for("react.memo_cache_sentinel"),
        Me = Symbol.iterator;

    function Se(e) {
        return e === null || typeof e != "object" ? null : (e = Me && e[Me] || e["@@iterator"], typeof e == "function" ? e : null)
    }
    var Fe = Symbol.for("react.client.reference");

    function ze(e) {
        if (e == null) return null;
        if (typeof e == "function") return e.$$typeof === Fe ? null : e.displayName || e.name || null;
        if (typeof e == "string") return e;
        switch (e) {
            case G:
                return "Fragment";
            case U:
                return "Profiler";
            case Y:
                return "StrictMode";
            case se:
                return "Suspense";
            case he:
                return "SuspenseList";
            case ce:
                return "Activity"
        }
        if (typeof e == "object") switch (e.$$typeof) {
            case A:
                return "Portal";
            case P:
                return e.displayName || "Context";
            case I:
                return (e._context.displayName || "Context") + ".Consumer";
            case W:
                var t = e.render;
                return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
            case $:
                return t = e.displayName || null, t !== null ? t : ze(e.type) || "Memo";
            case ne:
                t = e._payload, e = e._init;
                try {
                    return ze(e(t))
                } catch {}
        }
        return null
    }
    var Ae = Array.isArray,
        O = i.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
        E = l.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
        ae = {
            pending: !1,
            data: null,
            method: null,
            action: null
        },
        ge = [],
        Ne = -1;

    function T(e) {
        return {
            current: e
        }
    }

    function X(e) {
        0 > Ne || (e.current = ge[Ne], ge[Ne] = null, Ne--)
    }

    function K(e, t) {
        Ne++, ge[Ne] = e.current, e.current = t
    }
    var re = T(null),
        ye = T(null),
        Te = T(null),
        we = T(null);

    function Le(e, t) {
        switch (K(Te, t), K(ye, e), K(re, null), t.nodeType) {
            case 9:
            case 11:
                e = (e = t.documentElement) && (e = e.namespaceURI) ? gp(e) : 0;
                break;
            default:
                if (e = t.tagName, t = t.namespaceURI) t = gp(t), e = yp(t, e);
                else switch (e) {
                    case "svg":
                        e = 1;
                        break;
                    case "math":
                        e = 2;
                        break;
                    default:
                        e = 0
                }
        }
        X(re), K(re, e)
    }

    function Ee() {
        X(re), X(ye), X(Te)
    }

    function yt(e) {
        e.memoizedState !== null && K(we, e);
        var t = re.current,
            n = yp(t, e.type);
        t !== n && (K(ye, e), K(re, n))
    }

    function Zt(e) {
        ye.current === e && (X(re), X(ye)), we.current === e && (X(we), ul._currentValue = ae)
    }
    var zt, jt;

    function Ve(e) {
        if (zt === void 0) try {
            throw Error()
        } catch (n) {
            var t = n.stack.trim().match(/\n( *(at )?)/);
            zt = t && t[1] || "", jt = -1 < n.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < n.stack.indexOf("@") ? "@unknown:0:0" : ""
        }
        return `
` + zt + e + jt
    }
    var We = !1;

    function Ce(e, t) {
        if (!e || We) return "";
        We = !0;
        var n = Error.prepareStackTrace;
        Error.prepareStackTrace = void 0;
        try {
            var s = {
                DetermineComponentFrameRoot: function() {
                    try {
                        if (t) {
                            var Q = function() {
                                throw Error()
                            };
                            if (Object.defineProperty(Q.prototype, "props", {
                                    set: function() {
                                        throw Error()
                                    }
                                }), typeof Reflect == "object" && Reflect.construct) {
                                try {
                                    Reflect.construct(Q, [])
                                } catch (B) {
                                    var L = B
                                }
                                Reflect.construct(e, [], Q)
                            } else {
                                try {
                                    Q.call()
                                } catch (B) {
                                    L = B
                                }
                                e.call(Q.prototype)
                            }
                        } else {
                            try {
                                throw Error()
                            } catch (B) {
                                L = B
                            }(Q = e()) && typeof Q.catch == "function" && Q.catch(function() {})
                        }
                    } catch (B) {
                        if (B && L && typeof B.stack == "string") return [B.stack, L.stack]
                    }
                    return [null, null]
                }
            };
            s.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
            var o = Object.getOwnPropertyDescriptor(s.DetermineComponentFrameRoot, "name");
            o && o.configurable && Object.defineProperty(s.DetermineComponentFrameRoot, "name", {
                value: "DetermineComponentFrameRoot"
            });
            var c = s.DetermineComponentFrameRoot(),
                p = c[0],
                v = c[1];
            if (p && v) {
                var N = p.split(`
`),
                    _ = v.split(`
`);
                for (o = s = 0; s < N.length && !N[s].includes("DetermineComponentFrameRoot");) s++;
                for (; o < _.length && !_[o].includes("DetermineComponentFrameRoot");) o++;
                if (s === N.length || o === _.length)
                    for (s = N.length - 1, o = _.length - 1; 1 <= s && 0 <= o && N[s] !== _[o];) o--;
                for (; 1 <= s && 0 <= o; s--, o--)
                    if (N[s] !== _[o]) {
                        if (s !== 1 || o !== 1)
                            do
                                if (s--, o--, 0 > o || N[s] !== _[o]) {
                                    var k = `
` + N[s].replace(" at new ", " at ");
                                    return e.displayName && k.includes("<anonymous>") && (k = k.replace("<anonymous>", e.displayName)), k
                                } while (1 <= s && 0 <= o);
                        break
                    }
            }
        } finally {
            We = !1, Error.prepareStackTrace = n
        }
        return (n = e ? e.displayName || e.name : "") ? Ve(n) : ""
    }

    function _t(e, t) {
        switch (e.tag) {
            case 26:
            case 27:
            case 5:
                return Ve(e.type);
            case 16:
                return Ve("Lazy");
            case 13:
                return e.child !== t && t !== null ? Ve("Suspense Fallback") : Ve("Suspense");
            case 19:
                return Ve("SuspenseList");
            case 0:
            case 15:
                return Ce(e.type, !1);
            case 11:
                return Ce(e.type.render, !1);
            case 1:
                return Ce(e.type, !0);
            case 31:
                return Ve("Activity");
            default:
                return ""
        }
    }

    function Nn(e) {
        try {
            var t = "",
                n = null;
            do t += _t(e, n), n = e, e = e.return; while (e);
            return t
        } catch (s) {
            return `
Error generating stack: ` + s.message + `
` + s.stack
        }
    }
    var jn = Object.prototype.hasOwnProperty,
        Yt = a.unstable_scheduleCallback,
        Ye = a.unstable_cancelCallback,
        on = a.unstable_shouldYield,
        li = a.unstable_requestPaint,
        pt = a.unstable_now,
        ri = a.unstable_getCurrentPriorityLevel,
        oi = a.unstable_ImmediatePriority,
        Vi = a.unstable_UserBlockingPriority,
        Ta = a.unstable_NormalPriority,
        aa = a.unstable_LowPriority,
        Bn = a.unstable_IdlePriority,
        Bi = a.log,
        Un = a.unstable_setDisableYieldValue,
        ie = null,
        Mt = null;

    function Ke(e) {
        if (typeof Bi == "function" && Un(e), Mt && typeof Mt.setStrictMode == "function") try {
            Mt.setStrictMode(ie, e)
        } catch {}
    }
    var Lt = Math.clz32 ? Math.clz32 : an,
        ci = Math.log,
        ia = Math.LN2;

    function an(e) {
        return e >>>= 0, e === 0 ? 32 : 31 - (ci(e) / ia | 0) | 0
    }
    var St = 256,
        R = 262144,
        fe = 4194304;

    function De(e) {
        var t = e & 42;
        if (t !== 0) return t;
        switch (e & -e) {
            case 1:
                return 1;
            case 2:
                return 2;
            case 4:
                return 4;
            case 8:
                return 8;
            case 16:
                return 16;
            case 32:
                return 32;
            case 64:
                return 64;
            case 128:
                return 128;
            case 256:
            case 512:
            case 1024:
            case 2048:
            case 4096:
            case 8192:
            case 16384:
            case 32768:
            case 65536:
            case 131072:
                return e & 261888;
            case 262144:
            case 524288:
            case 1048576:
            case 2097152:
                return e & 3932160;
            case 4194304:
            case 8388608:
            case 16777216:
            case 33554432:
                return e & 62914560;
            case 67108864:
                return 67108864;
            case 134217728:
                return 134217728;
            case 268435456:
                return 268435456;
            case 536870912:
                return 536870912;
            case 1073741824:
                return 0;
            default:
                return e
        }
    }

    function Je(e, t, n) {
        var s = e.pendingLanes;
        if (s === 0) return 0;
        var o = 0,
            c = e.suspendedLanes,
            p = e.pingedLanes;
        e = e.warmLanes;
        var v = s & 134217727;
        return v !== 0 ? (s = v & ~c, s !== 0 ? o = De(s) : (p &= v, p !== 0 ? o = De(p) : n || (n = v & ~e, n !== 0 && (o = De(n))))) : (v = s & ~c, v !== 0 ? o = De(v) : p !== 0 ? o = De(p) : n || (n = s & ~e, n !== 0 && (o = De(n)))), o === 0 ? 0 : t !== 0 && t !== o && (t & c) === 0 && (c = o & -o, n = t & -t, c >= n || c === 32 && (n & 4194048) !== 0) ? t : o
    }

    function wt(e, t) {
        return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0
    }

    function Hn(e, t) {
        switch (e) {
            case 1:
            case 2:
            case 4:
            case 8:
            case 64:
                return t + 250;
            case 16:
            case 32:
            case 128:
            case 256:
            case 512:
            case 1024:
            case 2048:
            case 4096:
            case 8192:
            case 16384:
            case 32768:
            case 65536:
            case 131072:
            case 262144:
            case 524288:
            case 1048576:
            case 2097152:
                return t + 5e3;
            case 4194304:
            case 8388608:
            case 16777216:
            case 33554432:
                return -1;
            case 67108864:
            case 134217728:
            case 268435456:
            case 536870912:
            case 1073741824:
                return -1;
            default:
                return -1
        }
    }

    function Mn() {
        var e = fe;
        return fe <<= 1, (fe & 62914560) === 0 && (fe = 4194304), e
    }

    function Na(e) {
        for (var t = [], n = 0; 31 > n; n++) t.push(e);
        return t
    }

    function Zn(e, t) {
        e.pendingLanes |= t, t !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0)
    }

    function qt(e, t, n, s, o, c) {
        var p = e.pendingLanes;
        e.pendingLanes = n, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= n, e.entangledLanes &= n, e.errorRecoveryDisabledLanes &= n, e.shellSuspendCounter = 0;
        var v = e.entanglements,
            N = e.expirationTimes,
            _ = e.hiddenUpdates;
        for (n = p & ~n; 0 < n;) {
            var k = 31 - Lt(n),
                Q = 1 << k;
            v[k] = 0, N[k] = -1;
            var L = _[k];
            if (L !== null)
                for (_[k] = null, k = 0; k < L.length; k++) {
                    var B = L[k];
                    B !== null && (B.lane &= -536870913)
                }
            n &= ~Q
        }
        s !== 0 && ja(e, s, 0), c !== 0 && o === 0 && e.tag !== 0 && (e.suspendedLanes |= c & ~(p & ~t))
    }

    function ja(e, t, n) {
        e.pendingLanes |= t, e.suspendedLanes &= ~t;
        var s = 31 - Lt(t);
        e.entangledLanes |= t, e.entanglements[s] = e.entanglements[s] | 1073741824 | n & 261930
    }

    function kt(e, t) {
        var n = e.entangledLanes |= t;
        for (e = e.entanglements; n;) {
            var s = 31 - Lt(n),
                o = 1 << s;
            o & t | e[s] & t && (e[s] |= t), n &= ~o
        }
    }

    function Vl(e, t) {
        var n = t & -t;
        return n = (n & 42) !== 0 ? 1 : Ms(n), (n & (e.suspendedLanes | t)) !== 0 ? 0 : n
    }

    function Ms(e) {
        switch (e) {
            case 2:
                e = 1;
                break;
            case 8:
                e = 4;
                break;
            case 32:
                e = 16;
                break;
            case 256:
            case 512:
            case 1024:
            case 2048:
            case 4096:
            case 8192:
            case 16384:
            case 32768:
            case 65536:
            case 131072:
            case 262144:
            case 524288:
            case 1048576:
            case 2097152:
            case 4194304:
            case 8388608:
            case 16777216:
            case 33554432:
                e = 128;
                break;
            case 268435456:
                e = 134217728;
                break;
            default:
                e = 0
        }
        return e
    }

    function ui(e) {
        return e &= -e, 2 < e ? 8 < e ? (e & 134217727) !== 0 ? 32 : 268435456 : 8 : 2
    }

    function Bl() {
        var e = E.p;
        return e !== 0 ? e : (e = window.event, e === void 0 ? 32 : Gp(e.type))
    }

    function Ul(e, t) {
        var n = E.p;
        try {
            return E.p = e, t()
        } finally {
            E.p = n
        }
    }
    var Qn = Math.random().toString(36).slice(2),
        Vt = "__reactFiber$" + Qn,
        tn = "__reactProps$" + Qn,
        Ma = "__reactContainer$" + Qn,
        ws = "__reactEvents$" + Qn,
        Ro = "__reactListeners$" + Qn,
        Oo = "__reactHandles$" + Qn,
        Hl = "__reactResources$" + Qn,
        wa = "__reactMarker$" + Qn;

    function C(e) {
        delete e[Vt], delete e[tn], delete e[ws], delete e[Ro], delete e[Oo]
    }

    function F(e) {
        var t = e[Vt];
        if (t) return t;
        for (var n = e.parentNode; n;) {
            if (t = n[Ma] || n[Vt]) {
                if (n = t.alternate, t.child !== null || n !== null && n.child !== null)
                    for (e = jp(e); e !== null;) {
                        if (n = e[Vt]) return n;
                        e = jp(e)
                    }
                return t
            }
            e = n, n = e.parentNode
        }
        return null
    }

    function ee(e) {
        if (e = e[Vt] || e[Ma]) {
            var t = e.tag;
            if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3) return e
        }
        return null
    }

    function J(e) {
        var t = e.tag;
        if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
        throw Error(r(33))
    }

    function pe(e) {
        var t = e[Hl];
        return t || (t = e[Hl] = {
            hoistableStyles: new Map,
            hoistableScripts: new Map
        }), t
    }

    function q(e) {
        e[wa] = !0
    }
    var le = new Set,
        be = {};

    function V(e, t) {
        Re(e, t), Re(e + "Capture", t)
    }

    function Re(e, t) {
        for (be[e] = t, e = 0; e < t.length; e++) le.add(t[e])
    }
    var H = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),
        Be = {},
        xe = {};

    function Xt(e) {
        return jn.call(xe, e) ? !0 : jn.call(Be, e) ? !1 : H.test(e) ? xe[e] = !0 : (Be[e] = !0, !1)
    }

    function gt(e, t, n) {
        if (Xt(t))
            if (n === null) e.removeAttribute(t);
            else {
                switch (typeof n) {
                    case "undefined":
                    case "function":
                    case "symbol":
                        e.removeAttribute(t);
                        return;
                    case "boolean":
                        var s = t.toLowerCase().slice(0, 5);
                        if (s !== "data-" && s !== "aria-") {
                            e.removeAttribute(t);
                            return
                        }
                }
                e.setAttribute(t, "" + n)
            }
    }

    function oe(e, t, n) {
        if (n === null) e.removeAttribute(t);
        else {
            switch (typeof n) {
                case "undefined":
                case "function":
                case "symbol":
                case "boolean":
                    e.removeAttribute(t);
                    return
            }
            e.setAttribute(t, "" + n)
        }
    }

    function et(e, t, n, s) {
        if (s === null) e.removeAttribute(n);
        else {
            switch (typeof s) {
                case "undefined":
                case "function":
                case "symbol":
                case "boolean":
                    e.removeAttribute(n);
                    return
            }
            e.setAttributeNS(t, n, "" + s)
        }
    }

    function rt(e) {
        switch (typeof e) {
            case "bigint":
            case "boolean":
            case "number":
            case "string":
            case "undefined":
                return e;
            case "object":
                return e;
            default:
                return ""
        }
    }

    function fi(e) {
        var t = e.type;
        return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio")
    }

    function Pn(e, t, n) {
        var s = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
        if (!e.hasOwnProperty(t) && typeof s < "u" && typeof s.get == "function" && typeof s.set == "function") {
            var o = s.get,
                c = s.set;
            return Object.defineProperty(e, t, {
                configurable: !0,
                get: function() {
                    return o.call(this)
                },
                set: function(p) {
                    n = "" + p, c.call(this, p)
                }
            }), Object.defineProperty(e, t, {
                enumerable: s.enumerable
            }), {
                getValue: function() {
                    return n
                },
                setValue: function(p) {
                    n = "" + p
                },
                stopTracking: function() {
                    e._valueTracker = null, delete e[t]
                }
            }
        }
    }

    function Bt(e) {
        if (!e._valueTracker) {
            var t = fi(e) ? "checked" : "value";
            e._valueTracker = Pn(e, t, "" + e[t])
        }
    }

    function Qt(e) {
        if (!e) return !1;
        var t = e._valueTracker;
        if (!t) return !0;
        var n = t.getValue(),
            s = "";
        return e && (s = fi(e) ? e.checked ? "true" : "false" : e.value), e = s, e !== n ? (t.setValue(e), !0) : !1
    }

    function Ut(e) {
        if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
        try {
            return e.activeElement || e.body
        } catch {
            return e.body
        }
    }
    var di = /[\n"\\]/g;

    function Pt(e) {
        return e.replace(di, function(t) {
            return "\\" + t.charCodeAt(0).toString(16) + " "
        })
    }

    function mi(e, t, n, s, o, c, p, v) {
        e.name = "", p != null && typeof p != "function" && typeof p != "symbol" && typeof p != "boolean" ? e.type = p : e.removeAttribute("type"), t != null ? p === "number" ? (t === 0 && e.value === "" || e.value != t) && (e.value = "" + rt(t)) : e.value !== "" + rt(t) && (e.value = "" + rt(t)) : p !== "submit" && p !== "reset" || e.removeAttribute("value"), t != null ? ot(e, p, rt(t)) : n != null ? ot(e, p, rt(n)) : s != null && e.removeAttribute("value"), o == null && c != null && (e.defaultChecked = !!c), o != null && (e.checked = o && typeof o != "function" && typeof o != "symbol"), v != null && typeof v != "function" && typeof v != "symbol" && typeof v != "boolean" ? e.name = "" + rt(v) : e.removeAttribute("name")
    }

    function Aa(e, t, n, s, o, c, p, v) {
        if (c != null && typeof c != "function" && typeof c != "symbol" && typeof c != "boolean" && (e.type = c), t != null || n != null) {
            if (!(c !== "submit" && c !== "reset" || t != null)) {
                Bt(e);
                return
            }
            n = n != null ? "" + rt(n) : "", t = t != null ? "" + rt(t) : n, v || t === e.value || (e.value = t), e.defaultValue = t
        }
        s = s ?? o, s = typeof s != "function" && typeof s != "symbol" && !!s, e.checked = v ? e.checked : !!s, e.defaultChecked = !!s, p != null && typeof p != "function" && typeof p != "symbol" && typeof p != "boolean" && (e.name = p), Bt(e)
    }

    function ot(e, t, n) {
        t === "number" && Ut(e.ownerDocument) === e || e.defaultValue === "" + n || (e.defaultValue = "" + n)
    }

    function mt(e, t, n, s) {
        if (e = e.options, t) {
            t = {};
            for (var o = 0; o < n.length; o++) t["$" + n[o]] = !0;
            for (n = 0; n < e.length; n++) o = t.hasOwnProperty("$" + e[n].value), e[n].selected !== o && (e[n].selected = o), o && s && (e[n].defaultSelected = !0)
        } else {
            for (n = "" + rt(n), t = null, o = 0; o < e.length; o++) {
                if (e[o].value === n) {
                    e[o].selected = !0, s && (e[o].defaultSelected = !0);
                    return
                }
                t !== null || e[o].disabled || (t = e[o])
            }
            t !== null && (t.selected = !0)
        }
    }

    function Ea(e, t, n) {
        if (t != null && (t = "" + rt(t), t !== e.value && (e.value = t), n == null)) {
            e.defaultValue !== t && (e.defaultValue = t);
            return
        }
        e.defaultValue = n != null ? "" + rt(n) : ""
    }

    function At(e, t, n, s) {
        if (t == null) {
            if (s != null) {
                if (n != null) throw Error(r(92));
                if (Ae(s)) {
                    if (1 < s.length) throw Error(r(93));
                    s = s[0]
                }
                n = s
            }
            n == null && (n = ""), t = n
        }
        n = rt(t), e.defaultValue = n, s = e.textContent, s === n && s !== "" && s !== null && (e.value = s), Bt(e)
    }

    function wn(e, t) {
        if (t) {
            var n = e.firstChild;
            if (n && n === e.lastChild && n.nodeType === 3) {
                n.nodeValue = t;
                return
            }
        }
        e.textContent = t
    }
    var zo = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));

    function Gl(e, t, n) {
        var s = t.indexOf("--") === 0;
        n == null || typeof n == "boolean" || n === "" ? s ? e.setProperty(t, "") : t === "float" ? e.cssFloat = "" : e[t] = "" : s ? e.setProperty(t, n) : typeof n != "number" || n === 0 || zo.has(t) ? t === "float" ? e.cssFloat = n : e[t] = ("" + n).trim() : e[t] = n + "px"
    }

    function hd(e, t, n) {
        if (t != null && typeof t != "object") throw Error(r(62));
        if (e = e.style, n != null) {
            for (var s in n) !n.hasOwnProperty(s) || t != null && t.hasOwnProperty(s) || (s.indexOf("--") === 0 ? e.setProperty(s, "") : s === "float" ? e.cssFloat = "" : e[s] = "");
            for (var o in t) s = t[o], t.hasOwnProperty(o) && n[o] !== s && Gl(e, o, s)
        } else
            for (var c in t) t.hasOwnProperty(c) && Gl(e, c, t[c])
    }

    function _o(e) {
        if (e.indexOf("-") === -1) return !1;
        switch (e) {
            case "annotation-xml":
            case "color-profile":
            case "font-face":
            case "font-face-src":
            case "font-face-uri":
            case "font-face-format":
            case "font-face-name":
            case "missing-glyph":
                return !1;
            default:
                return !0
        }
    }
    var _x = new Map([
            ["acceptCharset", "accept-charset"],
            ["htmlFor", "for"],
            ["httpEquiv", "http-equiv"],
            ["crossOrigin", "crossorigin"],
            ["accentHeight", "accent-height"],
            ["alignmentBaseline", "alignment-baseline"],
            ["arabicForm", "arabic-form"],
            ["baselineShift", "baseline-shift"],
            ["capHeight", "cap-height"],
            ["clipPath", "clip-path"],
            ["clipRule", "clip-rule"],
            ["colorInterpolation", "color-interpolation"],
            ["colorInterpolationFilters", "color-interpolation-filters"],
            ["colorProfile", "color-profile"],
            ["colorRendering", "color-rendering"],
            ["dominantBaseline", "dominant-baseline"],
            ["enableBackground", "enable-background"],
            ["fillOpacity", "fill-opacity"],
            ["fillRule", "fill-rule"],
            ["floodColor", "flood-color"],
            ["floodOpacity", "flood-opacity"],
            ["fontFamily", "font-family"],
            ["fontSize", "font-size"],
            ["fontSizeAdjust", "font-size-adjust"],
            ["fontStretch", "font-stretch"],
            ["fontStyle", "font-style"],
            ["fontVariant", "font-variant"],
            ["fontWeight", "font-weight"],
            ["glyphName", "glyph-name"],
            ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
            ["glyphOrientationVertical", "glyph-orientation-vertical"],
            ["horizAdvX", "horiz-adv-x"],
            ["horizOriginX", "horiz-origin-x"],
            ["imageRendering", "image-rendering"],
            ["letterSpacing", "letter-spacing"],
            ["lightingColor", "lighting-color"],
            ["markerEnd", "marker-end"],
            ["markerMid", "marker-mid"],
            ["markerStart", "marker-start"],
            ["overlinePosition", "overline-position"],
            ["overlineThickness", "overline-thickness"],
            ["paintOrder", "paint-order"],
            ["panose-1", "panose-1"],
            ["pointerEvents", "pointer-events"],
            ["renderingIntent", "rendering-intent"],
            ["shapeRendering", "shape-rendering"],
            ["stopColor", "stop-color"],
            ["stopOpacity", "stop-opacity"],
            ["strikethroughPosition", "strikethrough-position"],
            ["strikethroughThickness", "strikethrough-thickness"],
            ["strokeDasharray", "stroke-dasharray"],
            ["strokeDashoffset", "stroke-dashoffset"],
            ["strokeLinecap", "stroke-linecap"],
            ["strokeLinejoin", "stroke-linejoin"],
            ["strokeMiterlimit", "stroke-miterlimit"],
            ["strokeOpacity", "stroke-opacity"],
            ["strokeWidth", "stroke-width"],
            ["textAnchor", "text-anchor"],
            ["textDecoration", "text-decoration"],
            ["textRendering", "text-rendering"],
            ["transformOrigin", "transform-origin"],
            ["underlinePosition", "underline-position"],
            ["underlineThickness", "underline-thickness"],
            ["unicodeBidi", "unicode-bidi"],
            ["unicodeRange", "unicode-range"],
            ["unitsPerEm", "units-per-em"],
            ["vAlphabetic", "v-alphabetic"],
            ["vHanging", "v-hanging"],
            ["vIdeographic", "v-ideographic"],
            ["vMathematical", "v-mathematical"],
            ["vectorEffect", "vector-effect"],
            ["vertAdvY", "vert-adv-y"],
            ["vertOriginX", "vert-origin-x"],
            ["vertOriginY", "vert-origin-y"],
            ["wordSpacing", "word-spacing"],
            ["writingMode", "writing-mode"],
            ["xmlnsXlink", "xmlns:xlink"],
            ["xHeight", "x-height"]
        ]),
        Lx = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;

    function Yl(e) {
        return Lx.test("" + e) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : e
    }

    function sa() {}
    var Lo = null;

    function Vo(e) {
        return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e
    }
    var Ui = null,
        Hi = null;

    function pd(e) {
        var t = ee(e);
        if (t && (e = t.stateNode)) {
            var n = e[tn] || null;
            e: switch (e = t.stateNode, t.type) {
                case "input":
                    if (mi(e, n.value, n.defaultValue, n.defaultValue, n.checked, n.defaultChecked, n.type, n.name), t = n.name, n.type === "radio" && t != null) {
                        for (n = e; n.parentNode;) n = n.parentNode;
                        for (n = n.querySelectorAll('input[name="' + Pt("" + t) + '"][type="radio"]'), t = 0; t < n.length; t++) {
                            var s = n[t];
                            if (s !== e && s.form === e.form) {
                                var o = s[tn] || null;
                                if (!o) throw Error(r(90));
                                mi(s, o.value, o.defaultValue, o.defaultValue, o.checked, o.defaultChecked, o.type, o.name)
                            }
                        }
                        for (t = 0; t < n.length; t++) s = n[t], s.form === e.form && Qt(s)
                    }
                    break e;
                case "textarea":
                    Ea(e, n.value, n.defaultValue);
                    break e;
                case "select":
                    t = n.value, t != null && mt(e, !!n.multiple, t, !1)
            }
        }
    }
    var Bo = !1;

    function gd(e, t, n) {
        if (Bo) return e(t, n);
        Bo = !0;
        try {
            var s = e(t);
            return s
        } finally {
            if (Bo = !1, (Ui !== null || Hi !== null) && (Er(), Ui && (t = Ui, e = Hi, Hi = Ui = null, pd(t), e)))
                for (t = 0; t < e.length; t++) pd(e[t])
        }
    }

    function As(e, t) {
        var n = e.stateNode;
        if (n === null) return null;
        var s = n[tn] || null;
        if (s === null) return null;
        n = s[t];
        e: switch (t) {
            case "onClick":
            case "onClickCapture":
            case "onDoubleClick":
            case "onDoubleClickCapture":
            case "onMouseDown":
            case "onMouseDownCapture":
            case "onMouseMove":
            case "onMouseMoveCapture":
            case "onMouseUp":
            case "onMouseUpCapture":
            case "onMouseEnter":
                (s = !s.disabled) || (e = e.type, s = !(e === "button" || e === "input" || e === "select" || e === "textarea")), e = !s;
                break e;
            default:
                e = !1
        }
        if (e) return null;
        if (n && typeof n != "function") throw Error(r(231, t, typeof n));
        return n
    }
    var la = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"),
        Uo = !1;
    if (la) try {
        var Es = {};
        Object.defineProperty(Es, "passive", {
            get: function() {
                Uo = !0
            }
        }), window.addEventListener("test", Es, Es), window.removeEventListener("test", Es, Es)
    } catch {
        Uo = !1
    }
    var Ca = null,
        Ho = null,
        ql = null;

    function yd() {
        if (ql) return ql;
        var e, t = Ho,
            n = t.length,
            s, o = "value" in Ca ? Ca.value : Ca.textContent,
            c = o.length;
        for (e = 0; e < n && t[e] === o[e]; e++);
        var p = n - e;
        for (s = 1; s <= p && t[n - s] === o[c - s]; s++);
        return ql = o.slice(e, 1 < s ? 1 - s : void 0)
    }

    function kl(e) {
        var t = e.keyCode;
        return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0
    }

    function Xl() {
        return !0
    }

    function xd() {
        return !1
    }

    function cn(e) {
        function t(n, s, o, c, p) {
            this._reactName = n, this._targetInst = o, this.type = s, this.nativeEvent = c, this.target = p, this.currentTarget = null;
            for (var v in e) e.hasOwnProperty(v) && (n = e[v], this[v] = n ? n(c) : c[v]);
            return this.isDefaultPrevented = (c.defaultPrevented != null ? c.defaultPrevented : c.returnValue === !1) ? Xl : xd, this.isPropagationStopped = xd, this
        }
        return b(t.prototype, {
            preventDefault: function() {
                this.defaultPrevented = !0;
                var n = this.nativeEvent;
                n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = !1), this.isDefaultPrevented = Xl)
            },
            stopPropagation: function() {
                var n = this.nativeEvent;
                n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0), this.isPropagationStopped = Xl)
            },
            persist: function() {},
            isPersistent: Xl
        }), t
    }
    var hi = {
            eventPhase: 0,
            bubbles: 0,
            cancelable: 0,
            timeStamp: function(e) {
                return e.timeStamp || Date.now()
            },
            defaultPrevented: 0,
            isTrusted: 0
        },
        Kl = cn(hi),
        Cs = b({}, hi, {
            view: 0,
            detail: 0
        }),
        Vx = cn(Cs),
        Go, Yo, Ds, Zl = b({}, Cs, {
            screenX: 0,
            screenY: 0,
            clientX: 0,
            clientY: 0,
            pageX: 0,
            pageY: 0,
            ctrlKey: 0,
            shiftKey: 0,
            altKey: 0,
            metaKey: 0,
            getModifierState: ko,
            button: 0,
            buttons: 0,
            relatedTarget: function(e) {
                return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget
            },
            movementX: function(e) {
                return "movementX" in e ? e.movementX : (e !== Ds && (Ds && e.type === "mousemove" ? (Go = e.screenX - Ds.screenX, Yo = e.screenY - Ds.screenY) : Yo = Go = 0, Ds = e), Go)
            },
            movementY: function(e) {
                return "movementY" in e ? e.movementY : Yo
            }
        }),
        vd = cn(Zl),
        Bx = b({}, Zl, {
            dataTransfer: 0
        }),
        Ux = cn(Bx),
        Hx = b({}, Cs, {
            relatedTarget: 0
        }),
        qo = cn(Hx),
        Gx = b({}, hi, {
            animationName: 0,
            elapsedTime: 0,
            pseudoElement: 0
        }),
        Yx = cn(Gx),
        qx = b({}, hi, {
            clipboardData: function(e) {
                return "clipboardData" in e ? e.clipboardData : window.clipboardData
            }
        }),
        kx = cn(qx),
        Xx = b({}, hi, {
            data: 0
        }),
        bd = cn(Xx),
        Kx = {
            Esc: "Escape",
            Spacebar: " ",
            Left: "ArrowLeft",
            Up: "ArrowUp",
            Right: "ArrowRight",
            Down: "ArrowDown",
            Del: "Delete",
            Win: "OS",
            Menu: "ContextMenu",
            Apps: "ContextMenu",
            Scroll: "ScrollLock",
            MozPrintableKey: "Unidentified"
        },
        Zx = {
            8: "Backspace",
            9: "Tab",
            12: "Clear",
            13: "Enter",
            16: "Shift",
            17: "Control",
            18: "Alt",
            19: "Pause",
            20: "CapsLock",
            27: "Escape",
            32: " ",
            33: "PageUp",
            34: "PageDown",
            35: "End",
            36: "Home",
            37: "ArrowLeft",
            38: "ArrowUp",
            39: "ArrowRight",
            40: "ArrowDown",
            45: "Insert",
            46: "Delete",
            112: "F1",
            113: "F2",
            114: "F3",
            115: "F4",
            116: "F5",
            117: "F6",
            118: "F7",
            119: "F8",
            120: "F9",
            121: "F10",
            122: "F11",
            123: "F12",
            144: "NumLock",
            145: "ScrollLock",
            224: "Meta"
        },
        Qx = {
            Alt: "altKey",
            Control: "ctrlKey",
            Meta: "metaKey",
            Shift: "shiftKey"
        };

    function Px(e) {
        var t = this.nativeEvent;
        return t.getModifierState ? t.getModifierState(e) : (e = Qx[e]) ? !!t[e] : !1
    }

    function ko() {
        return Px
    }
    var Fx = b({}, Cs, {
            key: function(e) {
                if (e.key) {
                    var t = Kx[e.key] || e.key;
                    if (t !== "Unidentified") return t
                }
                return e.type === "keypress" ? (e = kl(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Zx[e.keyCode] || "Unidentified" : ""
            },
            code: 0,
            location: 0,
            ctrlKey: 0,
            shiftKey: 0,
            altKey: 0,
            metaKey: 0,
            repeat: 0,
            locale: 0,
            getModifierState: ko,
            charCode: function(e) {
                return e.type === "keypress" ? kl(e) : 0
            },
            keyCode: function(e) {
                return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0
            },
            which: function(e) {
                return e.type === "keypress" ? kl(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0
            }
        }),
        Jx = cn(Fx),
        $x = b({}, Zl, {
            pointerId: 0,
            width: 0,
            height: 0,
            pressure: 0,
            tangentialPressure: 0,
            tiltX: 0,
            tiltY: 0,
            twist: 0,
            pointerType: 0,
            isPrimary: 0
        }),
        Sd = cn($x),
        Ix = b({}, Cs, {
            touches: 0,
            targetTouches: 0,
            changedTouches: 0,
            altKey: 0,
            metaKey: 0,
            ctrlKey: 0,
            shiftKey: 0,
            getModifierState: ko
        }),
        Wx = cn(Ix),
        ev = b({}, hi, {
            propertyName: 0,
            elapsedTime: 0,
            pseudoElement: 0
        }),
        tv = cn(ev),
        nv = b({}, Zl, {
            deltaX: function(e) {
                return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0
            },
            deltaY: function(e) {
                return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0
            },
            deltaZ: 0,
            deltaMode: 0
        }),
        av = cn(nv),
        iv = b({}, hi, {
            newState: 0,
            oldState: 0
        }),
        sv = cn(iv),
        lv = [9, 13, 27, 32],
        Xo = la && "CompositionEvent" in window,
        Rs = null;
    la && "documentMode" in document && (Rs = document.documentMode);
    var rv = la && "TextEvent" in window && !Rs,
        Td = la && (!Xo || Rs && 8 < Rs && 11 >= Rs),
        Nd = " ",
        jd = !1;

    function Md(e, t) {
        switch (e) {
            case "keyup":
                return lv.indexOf(t.keyCode) !== -1;
            case "keydown":
                return t.keyCode !== 229;
            case "keypress":
            case "mousedown":
            case "focusout":
                return !0;
            default:
                return !1
        }
    }

    function wd(e) {
        return e = e.detail, typeof e == "object" && "data" in e ? e.data : null
    }
    var Gi = !1;

    function ov(e, t) {
        switch (e) {
            case "compositionend":
                return wd(t);
            case "keypress":
                return t.which !== 32 ? null : (jd = !0, Nd);
            case "textInput":
                return e = t.data, e === Nd && jd ? null : e;
            default:
                return null
        }
    }

    function cv(e, t) {
        if (Gi) return e === "compositionend" || !Xo && Md(e, t) ? (e = yd(), ql = Ho = Ca = null, Gi = !1, e) : null;
        switch (e) {
            case "paste":
                return null;
            case "keypress":
                if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
                    if (t.char && 1 < t.char.length) return t.char;
                    if (t.which) return String.fromCharCode(t.which)
                }
                return null;
            case "compositionend":
                return Td && t.locale !== "ko" ? null : t.data;
            default:
                return null
        }
    }
    var uv = {
        color: !0,
        date: !0,
        datetime: !0,
        "datetime-local": !0,
        email: !0,
        month: !0,
        number: !0,
        password: !0,
        range: !0,
        search: !0,
        tel: !0,
        text: !0,
        time: !0,
        url: !0,
        week: !0
    };

    function Ad(e) {
        var t = e && e.nodeName && e.nodeName.toLowerCase();
        return t === "input" ? !!uv[e.type] : t === "textarea"
    }

    function Ed(e, t, n, s) {
        Ui ? Hi ? Hi.push(s) : Hi = [s] : Ui = s, t = Lr(t, "onChange"), 0 < t.length && (n = new Kl("onChange", "change", null, n, s), e.push({
            event: n,
            listeners: t
        }))
    }
    var Os = null,
        zs = null;

    function fv(e) {
        up(e, 0)
    }

    function Ql(e) {
        var t = J(e);
        if (Qt(t)) return e
    }

    function Cd(e, t) {
        if (e === "change") return t
    }
    var Dd = !1;
    if (la) {
        var Ko;
        if (la) {
            var Zo = "oninput" in document;
            if (!Zo) {
                var Rd = document.createElement("div");
                Rd.setAttribute("oninput", "return;"), Zo = typeof Rd.oninput == "function"
            }
            Ko = Zo
        } else Ko = !1;
        Dd = Ko && (!document.documentMode || 9 < document.documentMode)
    }

    function Od() {
        Os && (Os.detachEvent("onpropertychange", zd), zs = Os = null)
    }

    function zd(e) {
        if (e.propertyName === "value" && Ql(zs)) {
            var t = [];
            Ed(t, zs, e, Vo(e)), gd(fv, t)
        }
    }

    function dv(e, t, n) {
        e === "focusin" ? (Od(), Os = t, zs = n, Os.attachEvent("onpropertychange", zd)) : e === "focusout" && Od()
    }

    function mv(e) {
        if (e === "selectionchange" || e === "keyup" || e === "keydown") return Ql(zs)
    }

    function hv(e, t) {
        if (e === "click") return Ql(t)
    }

    function pv(e, t) {
        if (e === "input" || e === "change") return Ql(t)
    }

    function gv(e, t) {
        return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t
    }
    var pn = typeof Object.is == "function" ? Object.is : gv;

    function _s(e, t) {
        if (pn(e, t)) return !0;
        if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
        var n = Object.keys(e),
            s = Object.keys(t);
        if (n.length !== s.length) return !1;
        for (s = 0; s < n.length; s++) {
            var o = n[s];
            if (!jn.call(t, o) || !pn(e[o], t[o])) return !1
        }
        return !0
    }

    function _d(e) {
        for (; e && e.firstChild;) e = e.firstChild;
        return e
    }

    function Ld(e, t) {
        var n = _d(e);
        e = 0;
        for (var s; n;) {
            if (n.nodeType === 3) {
                if (s = e + n.textContent.length, e <= t && s >= t) return {
                    node: n,
                    offset: t - e
                };
                e = s
            }
            e: {
                for (; n;) {
                    if (n.nextSibling) {
                        n = n.nextSibling;
                        break e
                    }
                    n = n.parentNode
                }
                n = void 0
            }
            n = _d(n)
        }
    }

    function Vd(e, t) {
        return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Vd(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1
    }

    function Bd(e) {
        e = e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null ? e.ownerDocument.defaultView : window;
        for (var t = Ut(e.document); t instanceof e.HTMLIFrameElement;) {
            try {
                var n = typeof t.contentWindow.location.href == "string"
            } catch {
                n = !1
            }
            if (n) e = t.contentWindow;
            else break;
            t = Ut(e.document)
        }
        return t
    }

    function Qo(e) {
        var t = e && e.nodeName && e.nodeName.toLowerCase();
        return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true")
    }
    var yv = la && "documentMode" in document && 11 >= document.documentMode,
        Yi = null,
        Po = null,
        Ls = null,
        Fo = !1;

    function Ud(e, t, n) {
        var s = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
        Fo || Yi == null || Yi !== Ut(s) || (s = Yi, "selectionStart" in s && Qo(s) ? s = {
            start: s.selectionStart,
            end: s.selectionEnd
        } : (s = (s.ownerDocument && s.ownerDocument.defaultView || window).getSelection(), s = {
            anchorNode: s.anchorNode,
            anchorOffset: s.anchorOffset,
            focusNode: s.focusNode,
            focusOffset: s.focusOffset
        }), Ls && _s(Ls, s) || (Ls = s, s = Lr(Po, "onSelect"), 0 < s.length && (t = new Kl("onSelect", "select", null, t, n), e.push({
            event: t,
            listeners: s
        }), t.target = Yi)))
    }

    function pi(e, t) {
        var n = {};
        return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n
    }
    var qi = {
            animationend: pi("Animation", "AnimationEnd"),
            animationiteration: pi("Animation", "AnimationIteration"),
            animationstart: pi("Animation", "AnimationStart"),
            transitionrun: pi("Transition", "TransitionRun"),
            transitionstart: pi("Transition", "TransitionStart"),
            transitioncancel: pi("Transition", "TransitionCancel"),
            transitionend: pi("Transition", "TransitionEnd")
        },
        Jo = {},
        Hd = {};
    la && (Hd = document.createElement("div").style, "AnimationEvent" in window || (delete qi.animationend.animation, delete qi.animationiteration.animation, delete qi.animationstart.animation), "TransitionEvent" in window || delete qi.transitionend.transition);

    function gi(e) {
        if (Jo[e]) return Jo[e];
        if (!qi[e]) return e;
        var t = qi[e],
            n;
        for (n in t)
            if (t.hasOwnProperty(n) && n in Hd) return Jo[e] = t[n];
        return e
    }
    var Gd = gi("animationend"),
        Yd = gi("animationiteration"),
        qd = gi("animationstart"),
        xv = gi("transitionrun"),
        vv = gi("transitionstart"),
        bv = gi("transitioncancel"),
        kd = gi("transitionend"),
        Xd = new Map,
        $o = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
    $o.push("scrollEnd");

    function Gn(e, t) {
        Xd.set(e, t), V(t, [e])
    }
    var Pl = typeof reportError == "function" ? reportError : function(e) {
            if (typeof window == "object" && typeof window.ErrorEvent == "function") {
                var t = new window.ErrorEvent("error", {
                    bubbles: !0,
                    cancelable: !0,
                    message: typeof e == "object" && e !== null && typeof e.message == "string" ? String(e.message) : String(e),
                    error: e
                });
                if (!window.dispatchEvent(t)) return
            } else if (typeof process == "object" && typeof process.emit == "function") {
                process.emit("uncaughtException", e);
                return
            }
            console.error(e)
        },
        An = [],
        ki = 0,
        Io = 0;

    function Fl() {
        for (var e = ki, t = Io = ki = 0; t < e;) {
            var n = An[t];
            An[t++] = null;
            var s = An[t];
            An[t++] = null;
            var o = An[t];
            An[t++] = null;
            var c = An[t];
            if (An[t++] = null, s !== null && o !== null) {
                var p = s.pending;
                p === null ? o.next = o : (o.next = p.next, p.next = o), s.pending = o
            }
            c !== 0 && Kd(n, o, c)
        }
    }

    function Jl(e, t, n, s) {
        An[ki++] = e, An[ki++] = t, An[ki++] = n, An[ki++] = s, Io |= s, e.lanes |= s, e = e.alternate, e !== null && (e.lanes |= s)
    }

    function Wo(e, t, n, s) {
        return Jl(e, t, n, s), $l(e)
    }

    function yi(e, t) {
        return Jl(e, null, null, t), $l(e)
    }

    function Kd(e, t, n) {
        e.lanes |= n;
        var s = e.alternate;
        s !== null && (s.lanes |= n);
        for (var o = !1, c = e.return; c !== null;) c.childLanes |= n, s = c.alternate, s !== null && (s.childLanes |= n), c.tag === 22 && (e = c.stateNode, e === null || e._visibility & 1 || (o = !0)), e = c, c = c.return;
        return e.tag === 3 ? (c = e.stateNode, o && t !== null && (o = 31 - Lt(n), e = c.hiddenUpdates, s = e[o], s === null ? e[o] = [t] : s.push(t), t.lane = n | 536870912), c) : null
    }

    function $l(e) {
        if (50 < al) throw al = 0, ou = null, Error(r(185));
        for (var t = e.return; t !== null;) e = t, t = e.return;
        return e.tag === 3 ? e.stateNode : null
    }
    var Xi = {};

    function Sv(e, t, n, s) {
        this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = s, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null
    }

    function gn(e, t, n, s) {
        return new Sv(e, t, n, s)
    }

    function ec(e) {
        return e = e.prototype, !(!e || !e.isReactComponent)
    }

    function ra(e, t) {
        var n = e.alternate;
        return n === null ? (n = gn(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 65011712, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : {
            lanes: t.lanes,
            firstContext: t.firstContext
        }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n.refCleanup = e.refCleanup, n
    }

    function Zd(e, t) {
        e.flags &= 65011714;
        var n = e.alternate;
        return n === null ? (e.childLanes = 0, e.lanes = t, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = n.childLanes, e.lanes = n.lanes, e.child = n.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = n.memoizedProps, e.memoizedState = n.memoizedState, e.updateQueue = n.updateQueue, e.type = n.type, t = n.dependencies, e.dependencies = t === null ? null : {
            lanes: t.lanes,
            firstContext: t.firstContext
        }), e
    }

    function Il(e, t, n, s, o, c) {
        var p = 0;
        if (s = e, typeof e == "function") ec(e) && (p = 1);
        else if (typeof e == "string") p = w1(e, n, re.current) ? 26 : e === "html" || e === "head" || e === "body" ? 27 : 5;
        else e: switch (e) {
            case ce:
                return e = gn(31, n, t, o), e.elementType = ce, e.lanes = c, e;
            case G:
                return xi(n.children, o, c, t);
            case Y:
                p = 8, o |= 24;
                break;
            case U:
                return e = gn(12, n, t, o | 2), e.elementType = U, e.lanes = c, e;
            case se:
                return e = gn(13, n, t, o), e.elementType = se, e.lanes = c, e;
            case he:
                return e = gn(19, n, t, o), e.elementType = he, e.lanes = c, e;
            default:
                if (typeof e == "object" && e !== null) switch (e.$$typeof) {
                    case P:
                        p = 10;
                        break e;
                    case I:
                        p = 9;
                        break e;
                    case W:
                        p = 11;
                        break e;
                    case $:
                        p = 14;
                        break e;
                    case ne:
                        p = 16, s = null;
                        break e
                }
                p = 29, n = Error(r(130, e === null ? "null" : typeof e, "")), s = null
        }
        return t = gn(p, n, t, o), t.elementType = e, t.type = s, t.lanes = c, t
    }

    function xi(e, t, n, s) {
        return e = gn(7, e, s, t), e.lanes = n, e
    }

    function tc(e, t, n) {
        return e = gn(6, e, null, t), e.lanes = n, e
    }

    function Qd(e) {
        var t = gn(18, null, null, 0);
        return t.stateNode = e, t
    }

    function nc(e, t, n) {
        return t = gn(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = {
            containerInfo: e.containerInfo,
            pendingChildren: null,
            implementation: e.implementation
        }, t
    }
    var Pd = new WeakMap;

    function En(e, t) {
        if (typeof e == "object" && e !== null) {
            var n = Pd.get(e);
            return n !== void 0 ? n : (t = {
                value: e,
                source: t,
                stack: Nn(t)
            }, Pd.set(e, t), t)
        }
        return {
            value: e,
            source: t,
            stack: Nn(t)
        }
    }
    var Ki = [],
        Zi = 0,
        Wl = null,
        Vs = 0,
        Cn = [],
        Dn = 0,
        Da = null,
        Fn = 1,
        Jn = "";

    function oa(e, t) {
        Ki[Zi++] = Vs, Ki[Zi++] = Wl, Wl = e, Vs = t
    }

    function Fd(e, t, n) {
        Cn[Dn++] = Fn, Cn[Dn++] = Jn, Cn[Dn++] = Da, Da = e;
        var s = Fn;
        e = Jn;
        var o = 32 - Lt(s) - 1;
        s &= ~(1 << o), n += 1;
        var c = 32 - Lt(t) + o;
        if (30 < c) {
            var p = o - o % 5;
            c = (s & (1 << p) - 1).toString(32), s >>= p, o -= p, Fn = 1 << 32 - Lt(t) + o | n << o | s, Jn = c + e
        } else Fn = 1 << c | n << o | s, Jn = e
    }

    function ac(e) {
        e.return !== null && (oa(e, 1), Fd(e, 1, 0))
    }

    function ic(e) {
        for (; e === Wl;) Wl = Ki[--Zi], Ki[Zi] = null, Vs = Ki[--Zi], Ki[Zi] = null;
        for (; e === Da;) Da = Cn[--Dn], Cn[Dn] = null, Jn = Cn[--Dn], Cn[Dn] = null, Fn = Cn[--Dn], Cn[Dn] = null
    }

    function Jd(e, t) {
        Cn[Dn++] = Fn, Cn[Dn++] = Jn, Cn[Dn++] = Da, Fn = t.id, Jn = t.overflow, Da = e
    }
    var Ft = null,
        ct = null,
        Xe = !1,
        Ra = null,
        Rn = !1,
        sc = Error(r(519));

    function Oa(e) {
        var t = Error(r(418, 1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML", ""));
        throw Bs(En(t, e)), sc
    }

    function $d(e) {
        var t = e.stateNode,
            n = e.type,
            s = e.memoizedProps;
        switch (t[Vt] = e, t[tn] = s, n) {
            case "dialog":
                Ge("cancel", t), Ge("close", t);
                break;
            case "iframe":
            case "object":
            case "embed":
                Ge("load", t);
                break;
            case "video":
            case "audio":
                for (n = 0; n < sl.length; n++) Ge(sl[n], t);
                break;
            case "source":
                Ge("error", t);
                break;
            case "img":
            case "image":
            case "link":
                Ge("error", t), Ge("load", t);
                break;
            case "details":
                Ge("toggle", t);
                break;
            case "input":
                Ge("invalid", t), Aa(t, s.value, s.defaultValue, s.checked, s.defaultChecked, s.type, s.name, !0);
                break;
            case "select":
                Ge("invalid", t);
                break;
            case "textarea":
                Ge("invalid", t), At(t, s.value, s.defaultValue, s.children)
        }
        n = s.children, typeof n != "string" && typeof n != "number" && typeof n != "bigint" || t.textContent === "" + n || s.suppressHydrationWarning === !0 || hp(t.textContent, n) ? (s.popover != null && (Ge("beforetoggle", t), Ge("toggle", t)), s.onScroll != null && Ge("scroll", t), s.onScrollEnd != null && Ge("scrollend", t), s.onClick != null && (t.onclick = sa), t = !0) : t = !1, t || Oa(e, !0)
    }

    function Id(e) {
        for (Ft = e.return; Ft;) switch (Ft.tag) {
            case 5:
            case 31:
            case 13:
                Rn = !1;
                return;
            case 27:
            case 3:
                Rn = !0;
                return;
            default:
                Ft = Ft.return
        }
    }

    function Qi(e) {
        if (e !== Ft) return !1;
        if (!Xe) return Id(e), Xe = !0, !1;
        var t = e.tag,
            n;
        if ((n = t !== 3 && t !== 27) && ((n = t === 5) && (n = e.type, n = !(n !== "form" && n !== "button") || Nu(e.type, e.memoizedProps)), n = !n), n && ct && Oa(e), Id(e), t === 13) {
            if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(r(317));
            ct = Np(e)
        } else if (t === 31) {
            if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(r(317));
            ct = Np(e)
        } else t === 27 ? (t = ct, Za(e.type) ? (e = Eu, Eu = null, ct = e) : ct = t) : ct = Ft ? zn(e.stateNode.nextSibling) : null;
        return !0
    }

    function vi() {
        ct = Ft = null, Xe = !1
    }

    function lc() {
        var e = Ra;
        return e !== null && (mn === null ? mn = e : mn.push.apply(mn, e), Ra = null), e
    }

    function Bs(e) {
        Ra === null ? Ra = [e] : Ra.push(e)
    }
    var rc = T(null),
        bi = null,
        ca = null;

    function za(e, t, n) {
        K(rc, t._currentValue), t._currentValue = n
    }

    function ua(e) {
        e._currentValue = rc.current, X(rc)
    }

    function oc(e, t, n) {
        for (; e !== null;) {
            var s = e.alternate;
            if ((e.childLanes & t) !== t ? (e.childLanes |= t, s !== null && (s.childLanes |= t)) : s !== null && (s.childLanes & t) !== t && (s.childLanes |= t), e === n) break;
            e = e.return
        }
    }

    function cc(e, t, n, s) {
        var o = e.child;
        for (o !== null && (o.return = e); o !== null;) {
            var c = o.dependencies;
            if (c !== null) {
                var p = o.child;
                c = c.firstContext;
                e: for (; c !== null;) {
                    var v = c;
                    c = o;
                    for (var N = 0; N < t.length; N++)
                        if (v.context === t[N]) {
                            c.lanes |= n, v = c.alternate, v !== null && (v.lanes |= n), oc(c.return, n, e), s || (p = null);
                            break e
                        } c = v.next
                }
            } else if (o.tag === 18) {
                if (p = o.return, p === null) throw Error(r(341));
                p.lanes |= n, c = p.alternate, c !== null && (c.lanes |= n), oc(p, n, e), p = null
            } else p = o.child;
            if (p !== null) p.return = o;
            else
                for (p = o; p !== null;) {
                    if (p === e) {
                        p = null;
                        break
                    }
                    if (o = p.sibling, o !== null) {
                        o.return = p.return, p = o;
                        break
                    }
                    p = p.return
                }
            o = p
        }
    }

    function Pi(e, t, n, s) {
        e = null;
        for (var o = t, c = !1; o !== null;) {
            if (!c) {
                if ((o.flags & 524288) !== 0) c = !0;
                else if ((o.flags & 262144) !== 0) break
            }
            if (o.tag === 10) {
                var p = o.alternate;
                if (p === null) throw Error(r(387));
                if (p = p.memoizedProps, p !== null) {
                    var v = o.type;
                    pn(o.pendingProps.value, p.value) || (e !== null ? e.push(v) : e = [v])
                }
            } else if (o === we.current) {
                if (p = o.alternate, p === null) throw Error(r(387));
                p.memoizedState.memoizedState !== o.memoizedState.memoizedState && (e !== null ? e.push(ul) : e = [ul])
            }
            o = o.return
        }
        e !== null && cc(t, e, n, s), t.flags |= 262144
    }

    function er(e) {
        for (e = e.firstContext; e !== null;) {
            if (!pn(e.context._currentValue, e.memoizedValue)) return !0;
            e = e.next
        }
        return !1
    }

    function Si(e) {
        bi = e, ca = null, e = e.dependencies, e !== null && (e.firstContext = null)
    }

    function Jt(e) {
        return Wd(bi, e)
    }

    function tr(e, t) {
        return bi === null && Si(e), Wd(e, t)
    }

    function Wd(e, t) {
        var n = t._currentValue;
        if (t = {
                context: t,
                memoizedValue: n,
                next: null
            }, ca === null) {
            if (e === null) throw Error(r(308));
            ca = t, e.dependencies = {
                lanes: 0,
                firstContext: t
            }, e.flags |= 524288
        } else ca = ca.next = t;
        return n
    }
    var Tv = typeof AbortController < "u" ? AbortController : function() {
            var e = [],
                t = this.signal = {
                    aborted: !1,
                    addEventListener: function(n, s) {
                        e.push(s)
                    }
                };
            this.abort = function() {
                t.aborted = !0, e.forEach(function(n) {
                    return n()
                })
            }
        },
        Nv = a.unstable_scheduleCallback,
        jv = a.unstable_NormalPriority,
        Et = {
            $$typeof: P,
            Consumer: null,
            Provider: null,
            _currentValue: null,
            _currentValue2: null,
            _threadCount: 0
        };

    function uc() {
        return {
            controller: new Tv,
            data: new Map,
            refCount: 0
        }
    }

    function Us(e) {
        e.refCount--, e.refCount === 0 && Nv(jv, function() {
            e.controller.abort()
        })
    }
    var Hs = null,
        fc = 0,
        Fi = 0,
        Ji = null;

    function Mv(e, t) {
        if (Hs === null) {
            var n = Hs = [];
            fc = 0, Fi = hu(), Ji = {
                status: "pending",
                value: void 0,
                then: function(s) {
                    n.push(s)
                }
            }
        }
        return fc++, t.then(em, em), t
    }

    function em() {
        if (--fc === 0 && Hs !== null) {
            Ji !== null && (Ji.status = "fulfilled");
            var e = Hs;
            Hs = null, Fi = 0, Ji = null;
            for (var t = 0; t < e.length; t++)(0, e[t])()
        }
    }

    function wv(e, t) {
        var n = [],
            s = {
                status: "pending",
                value: null,
                reason: null,
                then: function(o) {
                    n.push(o)
                }
            };
        return e.then(function() {
            s.status = "fulfilled", s.value = t;
            for (var o = 0; o < n.length; o++)(0, n[o])(t)
        }, function(o) {
            for (s.status = "rejected", s.reason = o, o = 0; o < n.length; o++)(0, n[o])(void 0)
        }), s
    }
    var tm = O.S;
    O.S = function(e, t) {
        Uh = pt(), typeof t == "object" && t !== null && typeof t.then == "function" && Mv(e, t), tm !== null && tm(e, t)
    };
    var Ti = T(null);

    function dc() {
        var e = Ti.current;
        return e !== null ? e : it.pooledCache
    }

    function nr(e, t) {
        t === null ? K(Ti, Ti.current) : K(Ti, t.pool)
    }

    function nm() {
        var e = dc();
        return e === null ? null : {
            parent: Et._currentValue,
            pool: e
        }
    }
    var $i = Error(r(460)),
        mc = Error(r(474)),
        ar = Error(r(542)),
        ir = {
            then: function() {}
        };

    function am(e) {
        return e = e.status, e === "fulfilled" || e === "rejected"
    }

    function im(e, t, n) {
        switch (n = e[n], n === void 0 ? e.push(t) : n !== t && (t.then(sa, sa), t = n), t.status) {
            case "fulfilled":
                return t.value;
            case "rejected":
                throw e = t.reason, lm(e), e;
            default:
                if (typeof t.status == "string") t.then(sa, sa);
                else {
                    if (e = it, e !== null && 100 < e.shellSuspendCounter) throw Error(r(482));
                    e = t, e.status = "pending", e.then(function(s) {
                        if (t.status === "pending") {
                            var o = t;
                            o.status = "fulfilled", o.value = s
                        }
                    }, function(s) {
                        if (t.status === "pending") {
                            var o = t;
                            o.status = "rejected", o.reason = s
                        }
                    })
                }
                switch (t.status) {
                    case "fulfilled":
                        return t.value;
                    case "rejected":
                        throw e = t.reason, lm(e), e
                }
                throw ji = t, $i
        }
    }

    function Ni(e) {
        try {
            var t = e._init;
            return t(e._payload)
        } catch (n) {
            throw n !== null && typeof n == "object" && typeof n.then == "function" ? (ji = n, $i) : n
        }
    }
    var ji = null;

    function sm() {
        if (ji === null) throw Error(r(459));
        var e = ji;
        return ji = null, e
    }

    function lm(e) {
        if (e === $i || e === ar) throw Error(r(483))
    }
    var Ii = null,
        Gs = 0;

    function sr(e) {
        var t = Gs;
        return Gs += 1, Ii === null && (Ii = []), im(Ii, e, t)
    }

    function Ys(e, t) {
        t = t.props.ref, e.ref = t !== void 0 ? t : null
    }

    function lr(e, t) {
        throw t.$$typeof === S ? Error(r(525)) : (e = Object.prototype.toString.call(t), Error(r(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e)))
    }

    function rm(e) {
        function t(D, w) {
            if (e) {
                var z = D.deletions;
                z === null ? (D.deletions = [w], D.flags |= 16) : z.push(w)
            }
        }

        function n(D, w) {
            if (!e) return null;
            for (; w !== null;) t(D, w), w = w.sibling;
            return null
        }

        function s(D) {
            for (var w = new Map; D !== null;) D.key !== null ? w.set(D.key, D) : w.set(D.index, D), D = D.sibling;
            return w
        }

        function o(D, w) {
            return D = ra(D, w), D.index = 0, D.sibling = null, D
        }

        function c(D, w, z) {
            return D.index = z, e ? (z = D.alternate, z !== null ? (z = z.index, z < w ? (D.flags |= 67108866, w) : z) : (D.flags |= 67108866, w)) : (D.flags |= 1048576, w)
        }

        function p(D) {
            return e && D.alternate === null && (D.flags |= 67108866), D
        }

        function v(D, w, z, Z) {
            return w === null || w.tag !== 6 ? (w = tc(z, D.mode, Z), w.return = D, w) : (w = o(w, z), w.return = D, w)
        }

        function N(D, w, z, Z) {
            var ve = z.type;
            return ve === G ? k(D, w, z.props.children, Z, z.key) : w !== null && (w.elementType === ve || typeof ve == "object" && ve !== null && ve.$$typeof === ne && Ni(ve) === w.type) ? (w = o(w, z.props), Ys(w, z), w.return = D, w) : (w = Il(z.type, z.key, z.props, null, D.mode, Z), Ys(w, z), w.return = D, w)
        }

        function _(D, w, z, Z) {
            return w === null || w.tag !== 4 || w.stateNode.containerInfo !== z.containerInfo || w.stateNode.implementation !== z.implementation ? (w = nc(z, D.mode, Z), w.return = D, w) : (w = o(w, z.children || []), w.return = D, w)
        }

        function k(D, w, z, Z, ve) {
            return w === null || w.tag !== 7 ? (w = xi(z, D.mode, Z, ve), w.return = D, w) : (w = o(w, z), w.return = D, w)
        }

        function Q(D, w, z) {
            if (typeof w == "string" && w !== "" || typeof w == "number" || typeof w == "bigint") return w = tc("" + w, D.mode, z), w.return = D, w;
            if (typeof w == "object" && w !== null) {
                switch (w.$$typeof) {
                    case j:
                        return z = Il(w.type, w.key, w.props, null, D.mode, z), Ys(z, w), z.return = D, z;
                    case A:
                        return w = nc(w, D.mode, z), w.return = D, w;
                    case ne:
                        return w = Ni(w), Q(D, w, z)
                }
                if (Ae(w) || Se(w)) return w = xi(w, D.mode, z, null), w.return = D, w;
                if (typeof w.then == "function") return Q(D, sr(w), z);
                if (w.$$typeof === P) return Q(D, tr(D, w), z);
                lr(D, w)
            }
            return null
        }

        function L(D, w, z, Z) {
            var ve = w !== null ? w.key : null;
            if (typeof z == "string" && z !== "" || typeof z == "number" || typeof z == "bigint") return ve !== null ? null : v(D, w, "" + z, Z);
            if (typeof z == "object" && z !== null) {
                switch (z.$$typeof) {
                    case j:
                        return z.key === ve ? N(D, w, z, Z) : null;
                    case A:
                        return z.key === ve ? _(D, w, z, Z) : null;
                    case ne:
                        return z = Ni(z), L(D, w, z, Z)
                }
                if (Ae(z) || Se(z)) return ve !== null ? null : k(D, w, z, Z, null);
                if (typeof z.then == "function") return L(D, w, sr(z), Z);
                if (z.$$typeof === P) return L(D, w, tr(D, z), Z);
                lr(D, z)
            }
            return null
        }

        function B(D, w, z, Z, ve) {
            if (typeof Z == "string" && Z !== "" || typeof Z == "number" || typeof Z == "bigint") return D = D.get(z) || null, v(w, D, "" + Z, ve);
            if (typeof Z == "object" && Z !== null) {
                switch (Z.$$typeof) {
                    case j:
                        return D = D.get(Z.key === null ? z : Z.key) || null, N(w, D, Z, ve);
                    case A:
                        return D = D.get(Z.key === null ? z : Z.key) || null, _(w, D, Z, ve);
                    case ne:
                        return Z = Ni(Z), B(D, w, z, Z, ve)
                }
                if (Ae(Z) || Se(Z)) return D = D.get(z) || null, k(w, D, Z, ve, null);
                if (typeof Z.then == "function") return B(D, w, z, sr(Z), ve);
                if (Z.$$typeof === P) return B(D, w, z, tr(w, Z), ve);
                lr(w, Z)
            }
            return null
        }

        function ue(D, w, z, Z) {
            for (var ve = null, Ze = null, me = w, Ue = w = 0, ke = null; me !== null && Ue < z.length; Ue++) {
                me.index > Ue ? (ke = me, me = null) : ke = me.sibling;
                var Qe = L(D, me, z[Ue], Z);
                if (Qe === null) {
                    me === null && (me = ke);
                    break
                }
                e && me && Qe.alternate === null && t(D, me), w = c(Qe, w, Ue), Ze === null ? ve = Qe : Ze.sibling = Qe, Ze = Qe, me = ke
            }
            if (Ue === z.length) return n(D, me), Xe && oa(D, Ue), ve;
            if (me === null) {
                for (; Ue < z.length; Ue++) me = Q(D, z[Ue], Z), me !== null && (w = c(me, w, Ue), Ze === null ? ve = me : Ze.sibling = me, Ze = me);
                return Xe && oa(D, Ue), ve
            }
            for (me = s(me); Ue < z.length; Ue++) ke = B(me, D, Ue, z[Ue], Z), ke !== null && (e && ke.alternate !== null && me.delete(ke.key === null ? Ue : ke.key), w = c(ke, w, Ue), Ze === null ? ve = ke : Ze.sibling = ke, Ze = ke);
            return e && me.forEach(function($a) {
                return t(D, $a)
            }), Xe && oa(D, Ue), ve
        }

        function je(D, w, z, Z) {
            if (z == null) throw Error(r(151));
            for (var ve = null, Ze = null, me = w, Ue = w = 0, ke = null, Qe = z.next(); me !== null && !Qe.done; Ue++, Qe = z.next()) {
                me.index > Ue ? (ke = me, me = null) : ke = me.sibling;
                var $a = L(D, me, Qe.value, Z);
                if ($a === null) {
                    me === null && (me = ke);
                    break
                }
                e && me && $a.alternate === null && t(D, me), w = c($a, w, Ue), Ze === null ? ve = $a : Ze.sibling = $a, Ze = $a, me = ke
            }
            if (Qe.done) return n(D, me), Xe && oa(D, Ue), ve;
            if (me === null) {
                for (; !Qe.done; Ue++, Qe = z.next()) Qe = Q(D, Qe.value, Z), Qe !== null && (w = c(Qe, w, Ue), Ze === null ? ve = Qe : Ze.sibling = Qe, Ze = Qe);
                return Xe && oa(D, Ue), ve
            }
            for (me = s(me); !Qe.done; Ue++, Qe = z.next()) Qe = B(me, D, Ue, Qe.value, Z), Qe !== null && (e && Qe.alternate !== null && me.delete(Qe.key === null ? Ue : Qe.key), w = c(Qe, w, Ue), Ze === null ? ve = Qe : Ze.sibling = Qe, Ze = Qe);
            return e && me.forEach(function(B1) {
                return t(D, B1)
            }), Xe && oa(D, Ue), ve
        }

        function at(D, w, z, Z) {
            if (typeof z == "object" && z !== null && z.type === G && z.key === null && (z = z.props.children), typeof z == "object" && z !== null) {
                switch (z.$$typeof) {
                    case j:
                        e: {
                            for (var ve = z.key; w !== null;) {
                                if (w.key === ve) {
                                    if (ve = z.type, ve === G) {
                                        if (w.tag === 7) {
                                            n(D, w.sibling), Z = o(w, z.props.children), Z.return = D, D = Z;
                                            break e
                                        }
                                    } else if (w.elementType === ve || typeof ve == "object" && ve !== null && ve.$$typeof === ne && Ni(ve) === w.type) {
                                        n(D, w.sibling), Z = o(w, z.props), Ys(Z, z), Z.return = D, D = Z;
                                        break e
                                    }
                                    n(D, w);
                                    break
                                } else t(D, w);
                                w = w.sibling
                            }
                            z.type === G ? (Z = xi(z.props.children, D.mode, Z, z.key), Z.return = D, D = Z) : (Z = Il(z.type, z.key, z.props, null, D.mode, Z), Ys(Z, z), Z.return = D, D = Z)
                        }
                        return p(D);
                    case A:
                        e: {
                            for (ve = z.key; w !== null;) {
                                if (w.key === ve)
                                    if (w.tag === 4 && w.stateNode.containerInfo === z.containerInfo && w.stateNode.implementation === z.implementation) {
                                        n(D, w.sibling), Z = o(w, z.children || []), Z.return = D, D = Z;
                                        break e
                                    } else {
                                        n(D, w);
                                        break
                                    }
                                else t(D, w);
                                w = w.sibling
                            }
                            Z = nc(z, D.mode, Z),
                            Z.return = D,
                            D = Z
                        }
                        return p(D);
                    case ne:
                        return z = Ni(z), at(D, w, z, Z)
                }
                if (Ae(z)) return ue(D, w, z, Z);
                if (Se(z)) {
                    if (ve = Se(z), typeof ve != "function") throw Error(r(150));
                    return z = ve.call(z), je(D, w, z, Z)
                }
                if (typeof z.then == "function") return at(D, w, sr(z), Z);
                if (z.$$typeof === P) return at(D, w, tr(D, z), Z);
                lr(D, z)
            }
            return typeof z == "string" && z !== "" || typeof z == "number" || typeof z == "bigint" ? (z = "" + z, w !== null && w.tag === 6 ? (n(D, w.sibling), Z = o(w, z), Z.return = D, D = Z) : (n(D, w), Z = tc(z, D.mode, Z), Z.return = D, D = Z), p(D)) : n(D, w)
        }
        return function(D, w, z, Z) {
            try {
                Gs = 0;
                var ve = at(D, w, z, Z);
                return Ii = null, ve
            } catch (me) {
                if (me === $i || me === ar) throw me;
                var Ze = gn(29, me, null, D.mode);
                return Ze.lanes = Z, Ze.return = D, Ze
            } finally {}
        }
    }
    var Mi = rm(!0),
        om = rm(!1),
        _a = !1;

    function hc(e) {
        e.updateQueue = {
            baseState: e.memoizedState,
            firstBaseUpdate: null,
            lastBaseUpdate: null,
            shared: {
                pending: null,
                lanes: 0,
                hiddenCallbacks: null
            },
            callbacks: null
        }
    }

    function pc(e, t) {
        e = e.updateQueue, t.updateQueue === e && (t.updateQueue = {
            baseState: e.baseState,
            firstBaseUpdate: e.firstBaseUpdate,
            lastBaseUpdate: e.lastBaseUpdate,
            shared: e.shared,
            callbacks: null
        })
    }

    function La(e) {
        return {
            lane: e,
            tag: 0,
            payload: null,
            callback: null,
            next: null
        }
    }

    function Va(e, t, n) {
        var s = e.updateQueue;
        if (s === null) return null;
        if (s = s.shared, (Pe & 2) !== 0) {
            var o = s.pending;
            return o === null ? t.next = t : (t.next = o.next, o.next = t), s.pending = t, t = $l(e), Kd(e, null, n), t
        }
        return Jl(e, s, t, n), $l(e)
    }

    function qs(e, t, n) {
        if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194048) !== 0)) {
            var s = t.lanes;
            s &= e.pendingLanes, n |= s, t.lanes = n, kt(e, n)
        }
    }

    function gc(e, t) {
        var n = e.updateQueue,
            s = e.alternate;
        if (s !== null && (s = s.updateQueue, n === s)) {
            var o = null,
                c = null;
            if (n = n.firstBaseUpdate, n !== null) {
                do {
                    var p = {
                        lane: n.lane,
                        tag: n.tag,
                        payload: n.payload,
                        callback: null,
                        next: null
                    };
                    c === null ? o = c = p : c = c.next = p, n = n.next
                } while (n !== null);
                c === null ? o = c = t : c = c.next = t
            } else o = c = t;
            n = {
                baseState: s.baseState,
                firstBaseUpdate: o,
                lastBaseUpdate: c,
                shared: s.shared,
                callbacks: s.callbacks
            }, e.updateQueue = n;
            return
        }
        e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t
    }
    var yc = !1;

    function ks() {
        if (yc) {
            var e = Ji;
            if (e !== null) throw e
        }
    }

    function Xs(e, t, n, s) {
        yc = !1;
        var o = e.updateQueue;
        _a = !1;
        var c = o.firstBaseUpdate,
            p = o.lastBaseUpdate,
            v = o.shared.pending;
        if (v !== null) {
            o.shared.pending = null;
            var N = v,
                _ = N.next;
            N.next = null, p === null ? c = _ : p.next = _, p = N;
            var k = e.alternate;
            k !== null && (k = k.updateQueue, v = k.lastBaseUpdate, v !== p && (v === null ? k.firstBaseUpdate = _ : v.next = _, k.lastBaseUpdate = N))
        }
        if (c !== null) {
            var Q = o.baseState;
            p = 0, k = _ = N = null, v = c;
            do {
                var L = v.lane & -536870913,
                    B = L !== v.lane;
                if (B ? (qe & L) === L : (s & L) === L) {
                    L !== 0 && L === Fi && (yc = !0), k !== null && (k = k.next = {
                        lane: 0,
                        tag: v.tag,
                        payload: v.payload,
                        callback: null,
                        next: null
                    });
                    e: {
                        var ue = e,
                            je = v;L = t;
                        var at = n;
                        switch (je.tag) {
                            case 1:
                                if (ue = je.payload, typeof ue == "function") {
                                    Q = ue.call(at, Q, L);
                                    break e
                                }
                                Q = ue;
                                break e;
                            case 3:
                                ue.flags = ue.flags & -65537 | 128;
                            case 0:
                                if (ue = je.payload, L = typeof ue == "function" ? ue.call(at, Q, L) : ue, L == null) break e;
                                Q = b({}, Q, L);
                                break e;
                            case 2:
                                _a = !0
                        }
                    }
                    L = v.callback, L !== null && (e.flags |= 64, B && (e.flags |= 8192), B = o.callbacks, B === null ? o.callbacks = [L] : B.push(L))
                } else B = {
                    lane: L,
                    tag: v.tag,
                    payload: v.payload,
                    callback: v.callback,
                    next: null
                }, k === null ? (_ = k = B, N = Q) : k = k.next = B, p |= L;
                if (v = v.next, v === null) {
                    if (v = o.shared.pending, v === null) break;
                    B = v, v = B.next, B.next = null, o.lastBaseUpdate = B, o.shared.pending = null
                }
            } while (!0);
            k === null && (N = Q), o.baseState = N, o.firstBaseUpdate = _, o.lastBaseUpdate = k, c === null && (o.shared.lanes = 0), Ya |= p, e.lanes = p, e.memoizedState = Q
        }
    }

    function cm(e, t) {
        if (typeof e != "function") throw Error(r(191, e));
        e.call(t)
    }

    function um(e, t) {
        var n = e.callbacks;
        if (n !== null)
            for (e.callbacks = null, e = 0; e < n.length; e++) cm(n[e], t)
    }
    var Wi = T(null),
        rr = T(0);

    function fm(e, t) {
        e = va, K(rr, e), K(Wi, t), va = e | t.baseLanes
    }

    function xc() {
        K(rr, va), K(Wi, Wi.current)
    }

    function vc() {
        va = rr.current, X(Wi), X(rr)
    }
    var yn = T(null),
        On = null;

    function Ba(e) {
        var t = e.alternate;
        K(Tt, Tt.current & 1), K(yn, e), On === null && (t === null || Wi.current !== null || t.memoizedState !== null) && (On = e)
    }

    function bc(e) {
        K(Tt, Tt.current), K(yn, e), On === null && (On = e)
    }

    function dm(e) {
        e.tag === 22 ? (K(Tt, Tt.current), K(yn, e), On === null && (On = e)) : Ua()
    }

    function Ua() {
        K(Tt, Tt.current), K(yn, yn.current)
    }

    function xn(e) {
        X(yn), On === e && (On = null), X(Tt)
    }
    var Tt = T(0);

    function or(e) {
        for (var t = e; t !== null;) {
            if (t.tag === 13) {
                var n = t.memoizedState;
                if (n !== null && (n = n.dehydrated, n === null || wu(n) || Au(n))) return t
            } else if (t.tag === 19 && (t.memoizedProps.revealOrder === "forwards" || t.memoizedProps.revealOrder === "backwards" || t.memoizedProps.revealOrder === "unstable_legacy-backwards" || t.memoizedProps.revealOrder === "together")) {
                if ((t.flags & 128) !== 0) return t
            } else if (t.child !== null) {
                t.child.return = t, t = t.child;
                continue
            }
            if (t === e) break;
            for (; t.sibling === null;) {
                if (t.return === null || t.return === e) return null;
                t = t.return
            }
            t.sibling.return = t.return, t = t.sibling
        }
        return null
    }
    var fa = 0,
        _e = null,
        tt = null,
        Ct = null,
        cr = !1,
        es = !1,
        wi = !1,
        ur = 0,
        Ks = 0,
        ts = null,
        Av = 0;

    function xt() {
        throw Error(r(321))
    }

    function Sc(e, t) {
        if (t === null) return !1;
        for (var n = 0; n < t.length && n < e.length; n++)
            if (!pn(e[n], t[n])) return !1;
        return !0
    }

    function Tc(e, t, n, s, o, c) {
        return fa = c, _e = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, O.H = e === null || e.memoizedState === null ? Fm : Bc, wi = !1, c = n(s, o), wi = !1, es && (c = hm(t, n, s, o)), mm(e), c
    }

    function mm(e) {
        O.H = Ps;
        var t = tt !== null && tt.next !== null;
        if (fa = 0, Ct = tt = _e = null, cr = !1, Ks = 0, ts = null, t) throw Error(r(300));
        e === null || Dt || (e = e.dependencies, e !== null && er(e) && (Dt = !0))
    }

    function hm(e, t, n, s) {
        _e = e;
        var o = 0;
        do {
            if (es && (ts = null), Ks = 0, es = !1, 25 <= o) throw Error(r(301));
            if (o += 1, Ct = tt = null, e.updateQueue != null) {
                var c = e.updateQueue;
                c.lastEffect = null, c.events = null, c.stores = null, c.memoCache != null && (c.memoCache.index = 0)
            }
            O.H = Jm, c = t(n, s)
        } while (es);
        return c
    }

    function Ev() {
        var e = O.H,
            t = e.useState()[0];
        return t = typeof t.then == "function" ? Zs(t) : t, e = e.useState()[0], (tt !== null ? tt.memoizedState : null) !== e && (_e.flags |= 1024), t
    }

    function Nc() {
        var e = ur !== 0;
        return ur = 0, e
    }

    function jc(e, t, n) {
        t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~n
    }

    function Mc(e) {
        if (cr) {
            for (e = e.memoizedState; e !== null;) {
                var t = e.queue;
                t !== null && (t.pending = null), e = e.next
            }
            cr = !1
        }
        fa = 0, Ct = tt = _e = null, es = !1, Ks = ur = 0, ts = null
    }

    function sn() {
        var e = {
            memoizedState: null,
            baseState: null,
            baseQueue: null,
            queue: null,
            next: null
        };
        return Ct === null ? _e.memoizedState = Ct = e : Ct = Ct.next = e, Ct
    }

    function Nt() {
        if (tt === null) {
            var e = _e.alternate;
            e = e !== null ? e.memoizedState : null
        } else e = tt.next;
        var t = Ct === null ? _e.memoizedState : Ct.next;
        if (t !== null) Ct = t, tt = e;
        else {
            if (e === null) throw _e.alternate === null ? Error(r(467)) : Error(r(310));
            tt = e, e = {
                memoizedState: tt.memoizedState,
                baseState: tt.baseState,
                baseQueue: tt.baseQueue,
                queue: tt.queue,
                next: null
            }, Ct === null ? _e.memoizedState = Ct = e : Ct = Ct.next = e
        }
        return Ct
    }

    function fr() {
        return {
            lastEffect: null,
            events: null,
            stores: null,
            memoCache: null
        }
    }

    function Zs(e) {
        var t = Ks;
        return Ks += 1, ts === null && (ts = []), e = im(ts, e, t), t = _e, (Ct === null ? t.memoizedState : Ct.next) === null && (t = t.alternate, O.H = t === null || t.memoizedState === null ? Fm : Bc), e
    }

    function dr(e) {
        if (e !== null && typeof e == "object") {
            if (typeof e.then == "function") return Zs(e);
            if (e.$$typeof === P) return Jt(e)
        }
        throw Error(r(438, String(e)))
    }

    function wc(e) {
        var t = null,
            n = _e.updateQueue;
        if (n !== null && (t = n.memoCache), t == null) {
            var s = _e.alternate;
            s !== null && (s = s.updateQueue, s !== null && (s = s.memoCache, s != null && (t = {
                data: s.data.map(function(o) {
                    return o.slice()
                }),
                index: 0
            })))
        }
        if (t == null && (t = {
                data: [],
                index: 0
            }), n === null && (n = fr(), _e.updateQueue = n), n.memoCache = t, n = t.data[t.index], n === void 0)
            for (n = t.data[t.index] = Array(e), s = 0; s < e; s++) n[s] = te;
        return t.index++, n
    }

    function da(e, t) {
        return typeof t == "function" ? t(e) : t
    }

    function mr(e) {
        var t = Nt();
        return Ac(t, tt, e)
    }

    function Ac(e, t, n) {
        var s = e.queue;
        if (s === null) throw Error(r(311));
        s.lastRenderedReducer = n;
        var o = e.baseQueue,
            c = s.pending;
        if (c !== null) {
            if (o !== null) {
                var p = o.next;
                o.next = c.next, c.next = p
            }
            t.baseQueue = o = c, s.pending = null
        }
        if (c = e.baseState, o === null) e.memoizedState = c;
        else {
            t = o.next;
            var v = p = null,
                N = null,
                _ = t,
                k = !1;
            do {
                var Q = _.lane & -536870913;
                if (Q !== _.lane ? (qe & Q) === Q : (fa & Q) === Q) {
                    var L = _.revertLane;
                    if (L === 0) N !== null && (N = N.next = {
                        lane: 0,
                        revertLane: 0,
                        gesture: null,
                        action: _.action,
                        hasEagerState: _.hasEagerState,
                        eagerState: _.eagerState,
                        next: null
                    }), Q === Fi && (k = !0);
                    else if ((fa & L) === L) {
                        _ = _.next, L === Fi && (k = !0);
                        continue
                    } else Q = {
                        lane: 0,
                        revertLane: _.revertLane,
                        gesture: null,
                        action: _.action,
                        hasEagerState: _.hasEagerState,
                        eagerState: _.eagerState,
                        next: null
                    }, N === null ? (v = N = Q, p = c) : N = N.next = Q, _e.lanes |= L, Ya |= L;
                    Q = _.action, wi && n(c, Q), c = _.hasEagerState ? _.eagerState : n(c, Q)
                } else L = {
                    lane: Q,
                    revertLane: _.revertLane,
                    gesture: _.gesture,
                    action: _.action,
                    hasEagerState: _.hasEagerState,
                    eagerState: _.eagerState,
                    next: null
                }, N === null ? (v = N = L, p = c) : N = N.next = L, _e.lanes |= Q, Ya |= Q;
                _ = _.next
            } while (_ !== null && _ !== t);
            if (N === null ? p = c : N.next = v, !pn(c, e.memoizedState) && (Dt = !0, k && (n = Ji, n !== null))) throw n;
            e.memoizedState = c, e.baseState = p, e.baseQueue = N, s.lastRenderedState = c
        }
        return o === null && (s.lanes = 0), [e.memoizedState, s.dispatch]
    }

    function Ec(e) {
        var t = Nt(),
            n = t.queue;
        if (n === null) throw Error(r(311));
        n.lastRenderedReducer = e;
        var s = n.dispatch,
            o = n.pending,
            c = t.memoizedState;
        if (o !== null) {
            n.pending = null;
            var p = o = o.next;
            do c = e(c, p.action), p = p.next; while (p !== o);
            pn(c, t.memoizedState) || (Dt = !0), t.memoizedState = c, t.baseQueue === null && (t.baseState = c), n.lastRenderedState = c
        }
        return [c, s]
    }

    function pm(e, t, n) {
        var s = _e,
            o = Nt(),
            c = Xe;
        if (c) {
            if (n === void 0) throw Error(r(407));
            n = n()
        } else n = t();
        var p = !pn((tt || o).memoizedState, n);
        if (p && (o.memoizedState = n, Dt = !0), o = o.queue, Rc(xm.bind(null, s, o, e), [e]), o.getSnapshot !== t || p || Ct !== null && Ct.memoizedState.tag & 1) {
            if (s.flags |= 2048, ns(9, {
                    destroy: void 0
                }, ym.bind(null, s, o, n, t), null), it === null) throw Error(r(349));
            c || (fa & 127) !== 0 || gm(s, t, n)
        }
        return n
    }

    function gm(e, t, n) {
        e.flags |= 16384, e = {
            getSnapshot: t,
            value: n
        }, t = _e.updateQueue, t === null ? (t = fr(), _e.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e))
    }

    function ym(e, t, n, s) {
        t.value = n, t.getSnapshot = s, vm(t) && bm(e)
    }

    function xm(e, t, n) {
        return n(function() {
            vm(t) && bm(e)
        })
    }

    function vm(e) {
        var t = e.getSnapshot;
        e = e.value;
        try {
            var n = t();
            return !pn(e, n)
        } catch {
            return !0
        }
    }

    function bm(e) {
        var t = yi(e, 2);
        t !== null && hn(t, e, 2)
    }

    function Cc(e) {
        var t = sn();
        if (typeof e == "function") {
            var n = e;
            if (e = n(), wi) {
                Ke(!0);
                try {
                    n()
                } finally {
                    Ke(!1)
                }
            }
        }
        return t.memoizedState = t.baseState = e, t.queue = {
            pending: null,
            lanes: 0,
            dispatch: null,
            lastRenderedReducer: da,
            lastRenderedState: e
        }, t
    }

    function Sm(e, t, n, s) {
        return e.baseState = n, Ac(e, tt, typeof s == "function" ? s : da)
    }

    function Cv(e, t, n, s, o) {
        if (gr(e)) throw Error(r(485));
        if (e = t.action, e !== null) {
            var c = {
                payload: o,
                action: e,
                next: null,
                isTransition: !0,
                status: "pending",
                value: null,
                reason: null,
                listeners: [],
                then: function(p) {
                    c.listeners.push(p)
                }
            };
            O.T !== null ? n(!0) : c.isTransition = !1, s(c), n = t.pending, n === null ? (c.next = t.pending = c, Tm(t, c)) : (c.next = n.next, t.pending = n.next = c)
        }
    }

    function Tm(e, t) {
        var n = t.action,
            s = t.payload,
            o = e.state;
        if (t.isTransition) {
            var c = O.T,
                p = {};
            O.T = p;
            try {
                var v = n(o, s),
                    N = O.S;
                N !== null && N(p, v), Nm(e, t, v)
            } catch (_) {
                Dc(e, t, _)
            } finally {
                c !== null && p.types !== null && (c.types = p.types), O.T = c
            }
        } else try {
            c = n(o, s), Nm(e, t, c)
        } catch (_) {
            Dc(e, t, _)
        }
    }

    function Nm(e, t, n) {
        n !== null && typeof n == "object" && typeof n.then == "function" ? n.then(function(s) {
            jm(e, t, s)
        }, function(s) {
            return Dc(e, t, s)
        }) : jm(e, t, n)
    }

    function jm(e, t, n) {
        t.status = "fulfilled", t.value = n, Mm(t), e.state = n, t = e.pending, t !== null && (n = t.next, n === t ? e.pending = null : (n = n.next, t.next = n, Tm(e, n)))
    }

    function Dc(e, t, n) {
        var s = e.pending;
        if (e.pending = null, s !== null) {
            s = s.next;
            do t.status = "rejected", t.reason = n, Mm(t), t = t.next; while (t !== s)
        }
        e.action = null
    }

    function Mm(e) {
        e = e.listeners;
        for (var t = 0; t < e.length; t++)(0, e[t])()
    }

    function wm(e, t) {
        return t
    }

    function Am(e, t) {
        if (Xe) {
            var n = it.formState;
            if (n !== null) {
                e: {
                    var s = _e;
                    if (Xe) {
                        if (ct) {
                            t: {
                                for (var o = ct, c = Rn; o.nodeType !== 8;) {
                                    if (!c) {
                                        o = null;
                                        break t
                                    }
                                    if (o = zn(o.nextSibling), o === null) {
                                        o = null;
                                        break t
                                    }
                                }
                                c = o.data,
                                o = c === "F!" || c === "F" ? o : null
                            }
                            if (o) {
                                ct = zn(o.nextSibling), s = o.data === "F!";
                                break e
                            }
                        }
                        Oa(s)
                    }
                    s = !1
                }
                s && (t = n[0])
            }
        }
        return n = sn(), n.memoizedState = n.baseState = t, s = {
            pending: null,
            lanes: 0,
            dispatch: null,
            lastRenderedReducer: wm,
            lastRenderedState: t
        }, n.queue = s, n = Zm.bind(null, _e, s), s.dispatch = n, s = Cc(!1), c = Vc.bind(null, _e, !1, s.queue), s = sn(), o = {
            state: t,
            dispatch: null,
            action: e,
            pending: null
        }, s.queue = o, n = Cv.bind(null, _e, o, c, n), o.dispatch = n, s.memoizedState = e, [t, n, !1]
    }

    function Em(e) {
        var t = Nt();
        return Cm(t, tt, e)
    }

    function Cm(e, t, n) {
        if (t = Ac(e, t, wm)[0], e = mr(da)[0], typeof t == "object" && t !== null && typeof t.then == "function") try {
            var s = Zs(t)
        } catch (p) {
            throw p === $i ? ar : p
        } else s = t;
        t = Nt();
        var o = t.queue,
            c = o.dispatch;
        return n !== t.memoizedState && (_e.flags |= 2048, ns(9, {
            destroy: void 0
        }, Dv.bind(null, o, n), null)), [s, c, e]
    }

    function Dv(e, t) {
        e.action = t
    }

    function Dm(e) {
        var t = Nt(),
            n = tt;
        if (n !== null) return Cm(t, n, e);
        Nt(), t = t.memoizedState, n = Nt();
        var s = n.queue.dispatch;
        return n.memoizedState = e, [t, s, !1]
    }

    function ns(e, t, n, s) {
        return e = {
            tag: e,
            create: n,
            deps: s,
            inst: t,
            next: null
        }, t = _e.updateQueue, t === null && (t = fr(), _e.updateQueue = t), n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (s = n.next, n.next = e, e.next = s, t.lastEffect = e), e
    }

    function Rm() {
        return Nt().memoizedState
    }

    function hr(e, t, n, s) {
        var o = sn();
        _e.flags |= e, o.memoizedState = ns(1 | t, {
            destroy: void 0
        }, n, s === void 0 ? null : s)
    }

    function pr(e, t, n, s) {
        var o = Nt();
        s = s === void 0 ? null : s;
        var c = o.memoizedState.inst;
        tt !== null && s !== null && Sc(s, tt.memoizedState.deps) ? o.memoizedState = ns(t, c, n, s) : (_e.flags |= e, o.memoizedState = ns(1 | t, c, n, s))
    }

    function Om(e, t) {
        hr(8390656, 8, e, t)
    }

    function Rc(e, t) {
        pr(2048, 8, e, t)
    }

    function Rv(e) {
        _e.flags |= 4;
        var t = _e.updateQueue;
        if (t === null) t = fr(), _e.updateQueue = t, t.events = [e];
        else {
            var n = t.events;
            n === null ? t.events = [e] : n.push(e)
        }
    }

    function zm(e) {
        var t = Nt().memoizedState;
        return Rv({
                ref: t,
                nextImpl: e
            }),
            function() {
                if ((Pe & 2) !== 0) throw Error(r(440));
                return t.impl.apply(void 0, arguments)
            }
    }

    function _m(e, t) {
        return pr(4, 2, e, t)
    }

    function Lm(e, t) {
        return pr(4, 4, e, t)
    }

    function Vm(e, t) {
        if (typeof t == "function") {
            e = e();
            var n = t(e);
            return function() {
                typeof n == "function" ? n() : t(null)
            }
        }
        if (t != null) return e = e(), t.current = e,
            function() {
                t.current = null
            }
    }

    function Bm(e, t, n) {
        n = n != null ? n.concat([e]) : null, pr(4, 4, Vm.bind(null, t, e), n)
    }

    function Oc() {}

    function Um(e, t) {
        var n = Nt();
        t = t === void 0 ? null : t;
        var s = n.memoizedState;
        return t !== null && Sc(t, s[1]) ? s[0] : (n.memoizedState = [e, t], e)
    }

    function Hm(e, t) {
        var n = Nt();
        t = t === void 0 ? null : t;
        var s = n.memoizedState;
        if (t !== null && Sc(t, s[1])) return s[0];
        if (s = e(), wi) {
            Ke(!0);
            try {
                e()
            } finally {
                Ke(!1)
            }
        }
        return n.memoizedState = [s, t], s
    }

    function zc(e, t, n) {
        return n === void 0 || (fa & 1073741824) !== 0 && (qe & 261930) === 0 ? e.memoizedState = t : (e.memoizedState = n, e = Gh(), _e.lanes |= e, Ya |= e, n)
    }

    function Gm(e, t, n, s) {
        return pn(n, t) ? n : Wi.current !== null ? (e = zc(e, n, s), pn(e, t) || (Dt = !0), e) : (fa & 42) === 0 || (fa & 1073741824) !== 0 && (qe & 261930) === 0 ? (Dt = !0, e.memoizedState = n) : (e = Gh(), _e.lanes |= e, Ya |= e, t)
    }

    function Ym(e, t, n, s, o) {
        var c = E.p;
        E.p = c !== 0 && 8 > c ? c : 8;
        var p = O.T,
            v = {};
        O.T = v, Vc(e, !1, t, n);
        try {
            var N = o(),
                _ = O.S;
            if (_ !== null && _(v, N), N !== null && typeof N == "object" && typeof N.then == "function") {
                var k = wv(N, s);
                Qs(e, t, k, Sn(e))
            } else Qs(e, t, s, Sn(e))
        } catch (Q) {
            Qs(e, t, {
                then: function() {},
                status: "rejected",
                reason: Q
            }, Sn())
        } finally {
            E.p = c, p !== null && v.types !== null && (p.types = v.types), O.T = p
        }
    }

    function Ov() {}

    function _c(e, t, n, s) {
        if (e.tag !== 5) throw Error(r(476));
        var o = qm(e).queue;
        Ym(e, o, t, ae, n === null ? Ov : function() {
            return km(e), n(s)
        })
    }

    function qm(e) {
        var t = e.memoizedState;
        if (t !== null) return t;
        t = {
            memoizedState: ae,
            baseState: ae,
            baseQueue: null,
            queue: {
                pending: null,
                lanes: 0,
                dispatch: null,
                lastRenderedReducer: da,
                lastRenderedState: ae
            },
            next: null
        };
        var n = {};
        return t.next = {
            memoizedState: n,
            baseState: n,
            baseQueue: null,
            queue: {
                pending: null,
                lanes: 0,
                dispatch: null,
                lastRenderedReducer: da,
                lastRenderedState: n
            },
            next: null
        }, e.memoizedState = t, e = e.alternate, e !== null && (e.memoizedState = t), t
    }

    function km(e) {
        var t = qm(e);
        t.next === null && (t = e.alternate.memoizedState), Qs(e, t.next.queue, {}, Sn())
    }

    function Lc() {
        return Jt(ul)
    }

    function Xm() {
        return Nt().memoizedState
    }

    function Km() {
        return Nt().memoizedState
    }

    function zv(e) {
        for (var t = e.return; t !== null;) {
            switch (t.tag) {
                case 24:
                case 3:
                    var n = Sn();
                    e = La(n);
                    var s = Va(t, e, n);
                    s !== null && (hn(s, t, n), qs(s, t, n)), t = {
                        cache: uc()
                    }, e.payload = t;
                    return
            }
            t = t.return
        }
    }

    function _v(e, t, n) {
        var s = Sn();
        n = {
            lane: s,
            revertLane: 0,
            gesture: null,
            action: n,
            hasEagerState: !1,
            eagerState: null,
            next: null
        }, gr(e) ? Qm(t, n) : (n = Wo(e, t, n, s), n !== null && (hn(n, e, s), Pm(n, t, s)))
    }

    function Zm(e, t, n) {
        var s = Sn();
        Qs(e, t, n, s)
    }

    function Qs(e, t, n, s) {
        var o = {
            lane: s,
            revertLane: 0,
            gesture: null,
            action: n,
            hasEagerState: !1,
            eagerState: null,
            next: null
        };
        if (gr(e)) Qm(t, o);
        else {
            var c = e.alternate;
            if (e.lanes === 0 && (c === null || c.lanes === 0) && (c = t.lastRenderedReducer, c !== null)) try {
                var p = t.lastRenderedState,
                    v = c(p, n);
                if (o.hasEagerState = !0, o.eagerState = v, pn(v, p)) return Jl(e, t, o, 0), it === null && Fl(), !1
            } catch {} finally {}
            if (n = Wo(e, t, o, s), n !== null) return hn(n, e, s), Pm(n, t, s), !0
        }
        return !1
    }

    function Vc(e, t, n, s) {
        if (s = {
                lane: 2,
                revertLane: hu(),
                gesture: null,
                action: s,
                hasEagerState: !1,
                eagerState: null,
                next: null
            }, gr(e)) {
            if (t) throw Error(r(479))
        } else t = Wo(e, n, s, 2), t !== null && hn(t, e, 2)
    }

    function gr(e) {
        var t = e.alternate;
        return e === _e || t !== null && t === _e
    }

    function Qm(e, t) {
        es = cr = !0;
        var n = e.pending;
        n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t
    }

    function Pm(e, t, n) {
        if ((n & 4194048) !== 0) {
            var s = t.lanes;
            s &= e.pendingLanes, n |= s, t.lanes = n, kt(e, n)
        }
    }
    var Ps = {
        readContext: Jt,
        use: dr,
        useCallback: xt,
        useContext: xt,
        useEffect: xt,
        useImperativeHandle: xt,
        useLayoutEffect: xt,
        useInsertionEffect: xt,
        useMemo: xt,
        useReducer: xt,
        useRef: xt,
        useState: xt,
        useDebugValue: xt,
        useDeferredValue: xt,
        useTransition: xt,
        useSyncExternalStore: xt,
        useId: xt,
        useHostTransitionStatus: xt,
        useFormState: xt,
        useActionState: xt,
        useOptimistic: xt,
        useMemoCache: xt,
        useCacheRefresh: xt
    };
    Ps.useEffectEvent = xt;
    var Fm = {
            readContext: Jt,
            use: dr,
            useCallback: function(e, t) {
                return sn().memoizedState = [e, t === void 0 ? null : t], e
            },
            useContext: Jt,
            useEffect: Om,
            useImperativeHandle: function(e, t, n) {
                n = n != null ? n.concat([e]) : null, hr(4194308, 4, Vm.bind(null, t, e), n)
            },
            useLayoutEffect: function(e, t) {
                return hr(4194308, 4, e, t)
            },
            useInsertionEffect: function(e, t) {
                hr(4, 2, e, t)
            },
            useMemo: function(e, t) {
                var n = sn();
                t = t === void 0 ? null : t;
                var s = e();
                if (wi) {
                    Ke(!0);
                    try {
                        e()
                    } finally {
                        Ke(!1)
                    }
                }
                return n.memoizedState = [s, t], s
            },
            useReducer: function(e, t, n) {
                var s = sn();
                if (n !== void 0) {
                    var o = n(t);
                    if (wi) {
                        Ke(!0);
                        try {
                            n(t)
                        } finally {
                            Ke(!1)
                        }
                    }
                } else o = t;
                return s.memoizedState = s.baseState = o, e = {
                    pending: null,
                    lanes: 0,
                    dispatch: null,
                    lastRenderedReducer: e,
                    lastRenderedState: o
                }, s.queue = e, e = e.dispatch = _v.bind(null, _e, e), [s.memoizedState, e]
            },
            useRef: function(e) {
                var t = sn();
                return e = {
                    current: e
                }, t.memoizedState = e
            },
            useState: function(e) {
                e = Cc(e);
                var t = e.queue,
                    n = Zm.bind(null, _e, t);
                return t.dispatch = n, [e.memoizedState, n]
            },
            useDebugValue: Oc,
            useDeferredValue: function(e, t) {
                var n = sn();
                return zc(n, e, t)
            },
            useTransition: function() {
                var e = Cc(!1);
                return e = Ym.bind(null, _e, e.queue, !0, !1), sn().memoizedState = e, [!1, e]
            },
            useSyncExternalStore: function(e, t, n) {
                var s = _e,
                    o = sn();
                if (Xe) {
                    if (n === void 0) throw Error(r(407));
                    n = n()
                } else {
                    if (n = t(), it === null) throw Error(r(349));
                    (qe & 127) !== 0 || gm(s, t, n)
                }
                o.memoizedState = n;
                var c = {
                    value: n,
                    getSnapshot: t
                };
                return o.queue = c, Om(xm.bind(null, s, c, e), [e]), s.flags |= 2048, ns(9, {
                    destroy: void 0
                }, ym.bind(null, s, c, n, t), null), n
            },
            useId: function() {
                var e = sn(),
                    t = it.identifierPrefix;
                if (Xe) {
                    var n = Jn,
                        s = Fn;
                    n = (s & ~(1 << 32 - Lt(s) - 1)).toString(32) + n, t = "_" + t + "R_" + n, n = ur++, 0 < n && (t += "H" + n.toString(32)), t += "_"
                } else n = Av++, t = "_" + t + "r_" + n.toString(32) + "_";
                return e.memoizedState = t
            },
            useHostTransitionStatus: Lc,
            useFormState: Am,
            useActionState: Am,
            useOptimistic: function(e) {
                var t = sn();
                t.memoizedState = t.baseState = e;
                var n = {
                    pending: null,
                    lanes: 0,
                    dispatch: null,
                    lastRenderedReducer: null,
                    lastRenderedState: null
                };
                return t.queue = n, t = Vc.bind(null, _e, !0, n), n.dispatch = t, [e, t]
            },
            useMemoCache: wc,
            useCacheRefresh: function() {
                return sn().memoizedState = zv.bind(null, _e)
            },
            useEffectEvent: function(e) {
                var t = sn(),
                    n = {
                        impl: e
                    };
                return t.memoizedState = n,
                    function() {
                        if ((Pe & 2) !== 0) throw Error(r(440));
                        return n.impl.apply(void 0, arguments)
                    }
            }
        },
        Bc = {
            readContext: Jt,
            use: dr,
            useCallback: Um,
            useContext: Jt,
            useEffect: Rc,
            useImperativeHandle: Bm,
            useInsertionEffect: _m,
            useLayoutEffect: Lm,
            useMemo: Hm,
            useReducer: mr,
            useRef: Rm,
            useState: function() {
                return mr(da)
            },
            useDebugValue: Oc,
            useDeferredValue: function(e, t) {
                var n = Nt();
                return Gm(n, tt.memoizedState, e, t)
            },
            useTransition: function() {
                var e = mr(da)[0],
                    t = Nt().memoizedState;
                return [typeof e == "boolean" ? e : Zs(e), t]
            },
            useSyncExternalStore: pm,
            useId: Xm,
            useHostTransitionStatus: Lc,
            useFormState: Em,
            useActionState: Em,
            useOptimistic: function(e, t) {
                var n = Nt();
                return Sm(n, tt, e, t)
            },
            useMemoCache: wc,
            useCacheRefresh: Km
        };
    Bc.useEffectEvent = zm;
    var Jm = {
        readContext: Jt,
        use: dr,
        useCallback: Um,
        useContext: Jt,
        useEffect: Rc,
        useImperativeHandle: Bm,
        useInsertionEffect: _m,
        useLayoutEffect: Lm,
        useMemo: Hm,
        useReducer: Ec,
        useRef: Rm,
        useState: function() {
            return Ec(da)
        },
        useDebugValue: Oc,
        useDeferredValue: function(e, t) {
            var n = Nt();
            return tt === null ? zc(n, e, t) : Gm(n, tt.memoizedState, e, t)
        },
        useTransition: function() {
            var e = Ec(da)[0],
                t = Nt().memoizedState;
            return [typeof e == "boolean" ? e : Zs(e), t]
        },
        useSyncExternalStore: pm,
        useId: Xm,
        useHostTransitionStatus: Lc,
        useFormState: Dm,
        useActionState: Dm,
        useOptimistic: function(e, t) {
            var n = Nt();
            return tt !== null ? Sm(n, tt, e, t) : (n.baseState = e, [e, n.queue.dispatch])
        },
        useMemoCache: wc,
        useCacheRefresh: Km
    };
    Jm.useEffectEvent = zm;

    function Uc(e, t, n, s) {
        t = e.memoizedState, n = n(s, t), n = n == null ? t : b({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n)
    }
    var Hc = {
        enqueueSetState: function(e, t, n) {
            e = e._reactInternals;
            var s = Sn(),
                o = La(s);
            o.payload = t, n != null && (o.callback = n), t = Va(e, o, s), t !== null && (hn(t, e, s), qs(t, e, s))
        },
        enqueueReplaceState: function(e, t, n) {
            e = e._reactInternals;
            var s = Sn(),
                o = La(s);
            o.tag = 1, o.payload = t, n != null && (o.callback = n), t = Va(e, o, s), t !== null && (hn(t, e, s), qs(t, e, s))
        },
        enqueueForceUpdate: function(e, t) {
            e = e._reactInternals;
            var n = Sn(),
                s = La(n);
            s.tag = 2, t != null && (s.callback = t), t = Va(e, s, n), t !== null && (hn(t, e, n), qs(t, e, n))
        }
    };

    function $m(e, t, n, s, o, c, p) {
        return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(s, c, p) : t.prototype && t.prototype.isPureReactComponent ? !_s(n, s) || !_s(o, c) : !0
    }

    function Im(e, t, n, s) {
        e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, s), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, s), t.state !== e && Hc.enqueueReplaceState(t, t.state, null)
    }

    function Ai(e, t) {
        var n = t;
        if ("ref" in t) {
            n = {};
            for (var s in t) s !== "ref" && (n[s] = t[s])
        }
        if (e = e.defaultProps) {
            n === t && (n = b({}, n));
            for (var o in e) n[o] === void 0 && (n[o] = e[o])
        }
        return n
    }

    function Wm(e) {
        Pl(e)
    }

    function eh(e) {
        console.error(e)
    }

    function th(e) {
        Pl(e)
    }

    function yr(e, t) {
        try {
            var n = e.onUncaughtError;
            n(t.value, {
                componentStack: t.stack
            })
        } catch (s) {
            setTimeout(function() {
                throw s
            })
        }
    }

    function nh(e, t, n) {
        try {
            var s = e.onCaughtError;
            s(n.value, {
                componentStack: n.stack,
                errorBoundary: t.tag === 1 ? t.stateNode : null
            })
        } catch (o) {
            setTimeout(function() {
                throw o
            })
        }
    }

    function Gc(e, t, n) {
        return n = La(n), n.tag = 3, n.payload = {
            element: null
        }, n.callback = function() {
            yr(e, t)
        }, n
    }

    function ah(e) {
        return e = La(e), e.tag = 3, e
    }

    function ih(e, t, n, s) {
        var o = n.type.getDerivedStateFromError;
        if (typeof o == "function") {
            var c = s.value;
            e.payload = function() {
                return o(c)
            }, e.callback = function() {
                nh(t, n, s)
            }
        }
        var p = n.stateNode;
        p !== null && typeof p.componentDidCatch == "function" && (e.callback = function() {
            nh(t, n, s), typeof o != "function" && (qa === null ? qa = new Set([this]) : qa.add(this));
            var v = s.stack;
            this.componentDidCatch(s.value, {
                componentStack: v !== null ? v : ""
            })
        })
    }

    function Lv(e, t, n, s, o) {
        if (n.flags |= 32768, s !== null && typeof s == "object" && typeof s.then == "function") {
            if (t = n.alternate, t !== null && Pi(t, n, o, !0), n = yn.current, n !== null) {
                switch (n.tag) {
                    case 31:
                    case 13:
                        return On === null ? Cr() : n.alternate === null && vt === 0 && (vt = 3), n.flags &= -257, n.flags |= 65536, n.lanes = o, s === ir ? n.flags |= 16384 : (t = n.updateQueue, t === null ? n.updateQueue = new Set([s]) : t.add(s), fu(e, s, o)), !1;
                    case 22:
                        return n.flags |= 65536, s === ir ? n.flags |= 16384 : (t = n.updateQueue, t === null ? (t = {
                            transitions: null,
                            markerInstances: null,
                            retryQueue: new Set([s])
                        }, n.updateQueue = t) : (n = t.retryQueue, n === null ? t.retryQueue = new Set([s]) : n.add(s)), fu(e, s, o)), !1
                }
                throw Error(r(435, n.tag))
            }
            return fu(e, s, o), Cr(), !1
        }
        if (Xe) return t = yn.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = o, s !== sc && (e = Error(r(422), {
            cause: s
        }), Bs(En(e, n)))) : (s !== sc && (t = Error(r(423), {
            cause: s
        }), Bs(En(t, n))), e = e.current.alternate, e.flags |= 65536, o &= -o, e.lanes |= o, s = En(s, n), o = Gc(e.stateNode, s, o), gc(e, o), vt !== 4 && (vt = 2)), !1;
        var c = Error(r(520), {
            cause: s
        });
        if (c = En(c, n), nl === null ? nl = [c] : nl.push(c), vt !== 4 && (vt = 2), t === null) return !0;
        s = En(s, n), n = t;
        do {
            switch (n.tag) {
                case 3:
                    return n.flags |= 65536, e = o & -o, n.lanes |= e, e = Gc(n.stateNode, s, e), gc(n, e), !1;
                case 1:
                    if (t = n.type, c = n.stateNode, (n.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || c !== null && typeof c.componentDidCatch == "function" && (qa === null || !qa.has(c)))) return n.flags |= 65536, o &= -o, n.lanes |= o, o = ah(o), ih(o, e, n, s), gc(n, o), !1
            }
            n = n.return
        } while (n !== null);
        return !1
    }
    var Yc = Error(r(461)),
        Dt = !1;

    function $t(e, t, n, s) {
        t.child = e === null ? om(t, null, n, s) : Mi(t, e.child, n, s)
    }

    function sh(e, t, n, s, o) {
        n = n.render;
        var c = t.ref;
        if ("ref" in s) {
            var p = {};
            for (var v in s) v !== "ref" && (p[v] = s[v])
        } else p = s;
        return Si(t), s = Tc(e, t, n, p, c, o), v = Nc(), e !== null && !Dt ? (jc(e, t, o), ma(e, t, o)) : (Xe && v && ac(t), t.flags |= 1, $t(e, t, s, o), t.child)
    }

    function lh(e, t, n, s, o) {
        if (e === null) {
            var c = n.type;
            return typeof c == "function" && !ec(c) && c.defaultProps === void 0 && n.compare === null ? (t.tag = 15, t.type = c, rh(e, t, c, s, o)) : (e = Il(n.type, null, s, t, t.mode, o), e.ref = t.ref, e.return = t, t.child = e)
        }
        if (c = e.child, !Fc(e, o)) {
            var p = c.memoizedProps;
            if (n = n.compare, n = n !== null ? n : _s, n(p, s) && e.ref === t.ref) return ma(e, t, o)
        }
        return t.flags |= 1, e = ra(c, s), e.ref = t.ref, e.return = t, t.child = e
    }

    function rh(e, t, n, s, o) {
        if (e !== null) {
            var c = e.memoizedProps;
            if (_s(c, s) && e.ref === t.ref)
                if (Dt = !1, t.pendingProps = s = c, Fc(e, o))(e.flags & 131072) !== 0 && (Dt = !0);
                else return t.lanes = e.lanes, ma(e, t, o)
        }
        return qc(e, t, n, s, o)
    }

    function oh(e, t, n, s) {
        var o = s.children,
            c = e !== null ? e.memoizedState : null;
        if (e === null && t.stateNode === null && (t.stateNode = {
                _visibility: 1,
                _pendingMarkers: null,
                _retryCache: null,
                _transitions: null
            }), s.mode === "hidden") {
            if ((t.flags & 128) !== 0) {
                if (c = c !== null ? c.baseLanes | n : n, e !== null) {
                    for (s = t.child = e.child, o = 0; s !== null;) o = o | s.lanes | s.childLanes, s = s.sibling;
                    s = o & ~c
                } else s = 0, t.child = null;
                return ch(e, t, c, n, s)
            }
            if ((n & 536870912) !== 0) t.memoizedState = {
                baseLanes: 0,
                cachePool: null
            }, e !== null && nr(t, c !== null ? c.cachePool : null), c !== null ? fm(t, c) : xc(), dm(t);
            else return s = t.lanes = 536870912, ch(e, t, c !== null ? c.baseLanes | n : n, n, s)
        } else c !== null ? (nr(t, c.cachePool), fm(t, c), Ua(), t.memoizedState = null) : (e !== null && nr(t, null), xc(), Ua());
        return $t(e, t, o, n), t.child
    }

    function Fs(e, t) {
        return e !== null && e.tag === 22 || t.stateNode !== null || (t.stateNode = {
            _visibility: 1,
            _pendingMarkers: null,
            _retryCache: null,
            _transitions: null
        }), t.sibling
    }

    function ch(e, t, n, s, o) {
        var c = dc();
        return c = c === null ? null : {
            parent: Et._currentValue,
            pool: c
        }, t.memoizedState = {
            baseLanes: n,
            cachePool: c
        }, e !== null && nr(t, null), xc(), dm(t), e !== null && Pi(e, t, s, !0), t.childLanes = o, null
    }

    function xr(e, t) {
        return t = br({
            mode: t.mode,
            children: t.children
        }, e.mode), t.ref = e.ref, e.child = t, t.return = e, t
    }

    function uh(e, t, n) {
        return Mi(t, e.child, null, n), e = xr(t, t.pendingProps), e.flags |= 2, xn(t), t.memoizedState = null, e
    }

    function Vv(e, t, n) {
        var s = t.pendingProps,
            o = (t.flags & 128) !== 0;
        if (t.flags &= -129, e === null) {
            if (Xe) {
                if (s.mode === "hidden") return e = xr(t, s), t.lanes = 536870912, Fs(null, e);
                if (bc(t), (e = ct) ? (e = Tp(e, Rn), e = e !== null && e.data === "&" ? e : null, e !== null && (t.memoizedState = {
                        dehydrated: e,
                        treeContext: Da !== null ? {
                            id: Fn,
                            overflow: Jn
                        } : null,
                        retryLane: 536870912,
                        hydrationErrors: null
                    }, n = Qd(e), n.return = t, t.child = n, Ft = t, ct = null)) : e = null, e === null) throw Oa(t);
                return t.lanes = 536870912, null
            }
            return xr(t, s)
        }
        var c = e.memoizedState;
        if (c !== null) {
            var p = c.dehydrated;
            if (bc(t), o)
                if (t.flags & 256) t.flags &= -257, t = uh(e, t, n);
                else if (t.memoizedState !== null) t.child = e.child, t.flags |= 128, t = null;
            else throw Error(r(558));
            else if (Dt || Pi(e, t, n, !1), o = (n & e.childLanes) !== 0, Dt || o) {
                if (s = it, s !== null && (p = Vl(s, n), p !== 0 && p !== c.retryLane)) throw c.retryLane = p, yi(e, p), hn(s, e, p), Yc;
                Cr(), t = uh(e, t, n)
            } else e = c.treeContext, ct = zn(p.nextSibling), Ft = t, Xe = !0, Ra = null, Rn = !1, e !== null && Jd(t, e), t = xr(t, s), t.flags |= 4096;
            return t
        }
        return e = ra(e.child, {
            mode: s.mode,
            children: s.children
        }), e.ref = t.ref, t.child = e, e.return = t, e
    }

    function vr(e, t) {
        var n = t.ref;
        if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816);
        else {
            if (typeof n != "function" && typeof n != "object") throw Error(r(284));
            (e === null || e.ref !== n) && (t.flags |= 4194816)
        }
    }

    function qc(e, t, n, s, o) {
        return Si(t), n = Tc(e, t, n, s, void 0, o), s = Nc(), e !== null && !Dt ? (jc(e, t, o), ma(e, t, o)) : (Xe && s && ac(t), t.flags |= 1, $t(e, t, n, o), t.child)
    }

    function fh(e, t, n, s, o, c) {
        return Si(t), t.updateQueue = null, n = hm(t, s, n, o), mm(e), s = Nc(), e !== null && !Dt ? (jc(e, t, c), ma(e, t, c)) : (Xe && s && ac(t), t.flags |= 1, $t(e, t, n, c), t.child)
    }

    function dh(e, t, n, s, o) {
        if (Si(t), t.stateNode === null) {
            var c = Xi,
                p = n.contextType;
            typeof p == "object" && p !== null && (c = Jt(p)), c = new n(s, c), t.memoizedState = c.state !== null && c.state !== void 0 ? c.state : null, c.updater = Hc, t.stateNode = c, c._reactInternals = t, c = t.stateNode, c.props = s, c.state = t.memoizedState, c.refs = {}, hc(t), p = n.contextType, c.context = typeof p == "object" && p !== null ? Jt(p) : Xi, c.state = t.memoizedState, p = n.getDerivedStateFromProps, typeof p == "function" && (Uc(t, n, p, s), c.state = t.memoizedState), typeof n.getDerivedStateFromProps == "function" || typeof c.getSnapshotBeforeUpdate == "function" || typeof c.UNSAFE_componentWillMount != "function" && typeof c.componentWillMount != "function" || (p = c.state, typeof c.componentWillMount == "function" && c.componentWillMount(), typeof c.UNSAFE_componentWillMount == "function" && c.UNSAFE_componentWillMount(), p !== c.state && Hc.enqueueReplaceState(c, c.state, null), Xs(t, s, c, o), ks(), c.state = t.memoizedState), typeof c.componentDidMount == "function" && (t.flags |= 4194308), s = !0
        } else if (e === null) {
            c = t.stateNode;
            var v = t.memoizedProps,
                N = Ai(n, v);
            c.props = N;
            var _ = c.context,
                k = n.contextType;
            p = Xi, typeof k == "object" && k !== null && (p = Jt(k));
            var Q = n.getDerivedStateFromProps;
            k = typeof Q == "function" || typeof c.getSnapshotBeforeUpdate == "function", v = t.pendingProps !== v, k || typeof c.UNSAFE_componentWillReceiveProps != "function" && typeof c.componentWillReceiveProps != "function" || (v || _ !== p) && Im(t, c, s, p), _a = !1;
            var L = t.memoizedState;
            c.state = L, Xs(t, s, c, o), ks(), _ = t.memoizedState, v || L !== _ || _a ? (typeof Q == "function" && (Uc(t, n, Q, s), _ = t.memoizedState), (N = _a || $m(t, n, N, s, L, _, p)) ? (k || typeof c.UNSAFE_componentWillMount != "function" && typeof c.componentWillMount != "function" || (typeof c.componentWillMount == "function" && c.componentWillMount(), typeof c.UNSAFE_componentWillMount == "function" && c.UNSAFE_componentWillMount()), typeof c.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof c.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = s, t.memoizedState = _), c.props = s, c.state = _, c.context = p, s = N) : (typeof c.componentDidMount == "function" && (t.flags |= 4194308), s = !1)
        } else {
            c = t.stateNode, pc(e, t), p = t.memoizedProps, k = Ai(n, p), c.props = k, Q = t.pendingProps, L = c.context, _ = n.contextType, N = Xi, typeof _ == "object" && _ !== null && (N = Jt(_)), v = n.getDerivedStateFromProps, (_ = typeof v == "function" || typeof c.getSnapshotBeforeUpdate == "function") || typeof c.UNSAFE_componentWillReceiveProps != "function" && typeof c.componentWillReceiveProps != "function" || (p !== Q || L !== N) && Im(t, c, s, N), _a = !1, L = t.memoizedState, c.state = L, Xs(t, s, c, o), ks();
            var B = t.memoizedState;
            p !== Q || L !== B || _a || e !== null && e.dependencies !== null && er(e.dependencies) ? (typeof v == "function" && (Uc(t, n, v, s), B = t.memoizedState), (k = _a || $m(t, n, k, s, L, B, N) || e !== null && e.dependencies !== null && er(e.dependencies)) ? (_ || typeof c.UNSAFE_componentWillUpdate != "function" && typeof c.componentWillUpdate != "function" || (typeof c.componentWillUpdate == "function" && c.componentWillUpdate(s, B, N), typeof c.UNSAFE_componentWillUpdate == "function" && c.UNSAFE_componentWillUpdate(s, B, N)), typeof c.componentDidUpdate == "function" && (t.flags |= 4), typeof c.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof c.componentDidUpdate != "function" || p === e.memoizedProps && L === e.memoizedState || (t.flags |= 4), typeof c.getSnapshotBeforeUpdate != "function" || p === e.memoizedProps && L === e.memoizedState || (t.flags |= 1024), t.memoizedProps = s, t.memoizedState = B), c.props = s, c.state = B, c.context = N, s = k) : (typeof c.componentDidUpdate != "function" || p === e.memoizedProps && L === e.memoizedState || (t.flags |= 4), typeof c.getSnapshotBeforeUpdate != "function" || p === e.memoizedProps && L === e.memoizedState || (t.flags |= 1024), s = !1)
        }
        return c = s, vr(e, t), s = (t.flags & 128) !== 0, c || s ? (c = t.stateNode, n = s && typeof n.getDerivedStateFromError != "function" ? null : c.render(), t.flags |= 1, e !== null && s ? (t.child = Mi(t, e.child, null, o), t.child = Mi(t, null, n, o)) : $t(e, t, n, o), t.memoizedState = c.state, e = t.child) : e = ma(e, t, o), e
    }

    function mh(e, t, n, s) {
        return vi(), t.flags |= 256, $t(e, t, n, s), t.child
    }
    var kc = {
        dehydrated: null,
        treeContext: null,
        retryLane: 0,
        hydrationErrors: null
    };

    function Xc(e) {
        return {
            baseLanes: e,
            cachePool: nm()
        }
    }

    function Kc(e, t, n) {
        return e = e !== null ? e.childLanes & ~n : 0, t && (e |= bn), e
    }

    function hh(e, t, n) {
        var s = t.pendingProps,
            o = !1,
            c = (t.flags & 128) !== 0,
            p;
        if ((p = c) || (p = e !== null && e.memoizedState === null ? !1 : (Tt.current & 2) !== 0), p && (o = !0, t.flags &= -129), p = (t.flags & 32) !== 0, t.flags &= -33, e === null) {
            if (Xe) {
                if (o ? Ba(t) : Ua(), (e = ct) ? (e = Tp(e, Rn), e = e !== null && e.data !== "&" ? e : null, e !== null && (t.memoizedState = {
                        dehydrated: e,
                        treeContext: Da !== null ? {
                            id: Fn,
                            overflow: Jn
                        } : null,
                        retryLane: 536870912,
                        hydrationErrors: null
                    }, n = Qd(e), n.return = t, t.child = n, Ft = t, ct = null)) : e = null, e === null) throw Oa(t);
                return Au(e) ? t.lanes = 32 : t.lanes = 536870912, null
            }
            var v = s.children;
            return s = s.fallback, o ? (Ua(), o = t.mode, v = br({
                mode: "hidden",
                children: v
            }, o), s = xi(s, o, n, null), v.return = t, s.return = t, v.sibling = s, t.child = v, s = t.child, s.memoizedState = Xc(n), s.childLanes = Kc(e, p, n), t.memoizedState = kc, Fs(null, s)) : (Ba(t), Zc(t, v))
        }
        var N = e.memoizedState;
        if (N !== null && (v = N.dehydrated, v !== null)) {
            if (c) t.flags & 256 ? (Ba(t), t.flags &= -257, t = Qc(e, t, n)) : t.memoizedState !== null ? (Ua(), t.child = e.child, t.flags |= 128, t = null) : (Ua(), v = s.fallback, o = t.mode, s = br({
                mode: "visible",
                children: s.children
            }, o), v = xi(v, o, n, null), v.flags |= 2, s.return = t, v.return = t, s.sibling = v, t.child = s, Mi(t, e.child, null, n), s = t.child, s.memoizedState = Xc(n), s.childLanes = Kc(e, p, n), t.memoizedState = kc, t = Fs(null, s));
            else if (Ba(t), Au(v)) {
                if (p = v.nextSibling && v.nextSibling.dataset, p) var _ = p.dgst;
                p = _, s = Error(r(419)), s.stack = "", s.digest = p, Bs({
                    value: s,
                    source: null,
                    stack: null
                }), t = Qc(e, t, n)
            } else if (Dt || Pi(e, t, n, !1), p = (n & e.childLanes) !== 0, Dt || p) {
                if (p = it, p !== null && (s = Vl(p, n), s !== 0 && s !== N.retryLane)) throw N.retryLane = s, yi(e, s), hn(p, e, s), Yc;
                wu(v) || Cr(), t = Qc(e, t, n)
            } else wu(v) ? (t.flags |= 192, t.child = e.child, t = null) : (e = N.treeContext, ct = zn(v.nextSibling), Ft = t, Xe = !0, Ra = null, Rn = !1, e !== null && Jd(t, e), t = Zc(t, s.children), t.flags |= 4096);
            return t
        }
        return o ? (Ua(), v = s.fallback, o = t.mode, N = e.child, _ = N.sibling, s = ra(N, {
            mode: "hidden",
            children: s.children
        }), s.subtreeFlags = N.subtreeFlags & 65011712, _ !== null ? v = ra(_, v) : (v = xi(v, o, n, null), v.flags |= 2), v.return = t, s.return = t, s.sibling = v, t.child = s, Fs(null, s), s = t.child, v = e.child.memoizedState, v === null ? v = Xc(n) : (o = v.cachePool, o !== null ? (N = Et._currentValue, o = o.parent !== N ? {
            parent: N,
            pool: N
        } : o) : o = nm(), v = {
            baseLanes: v.baseLanes | n,
            cachePool: o
        }), s.memoizedState = v, s.childLanes = Kc(e, p, n), t.memoizedState = kc, Fs(e.child, s)) : (Ba(t), n = e.child, e = n.sibling, n = ra(n, {
            mode: "visible",
            children: s.children
        }), n.return = t, n.sibling = null, e !== null && (p = t.deletions, p === null ? (t.deletions = [e], t.flags |= 16) : p.push(e)), t.child = n, t.memoizedState = null, n)
    }

    function Zc(e, t) {
        return t = br({
            mode: "visible",
            children: t
        }, e.mode), t.return = e, e.child = t
    }

    function br(e, t) {
        return e = gn(22, e, null, t), e.lanes = 0, e
    }

    function Qc(e, t, n) {
        return Mi(t, e.child, null, n), e = Zc(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e
    }

    function ph(e, t, n) {
        e.lanes |= t;
        var s = e.alternate;
        s !== null && (s.lanes |= t), oc(e.return, t, n)
    }

    function Pc(e, t, n, s, o, c) {
        var p = e.memoizedState;
        p === null ? e.memoizedState = {
            isBackwards: t,
            rendering: null,
            renderingStartTime: 0,
            last: s,
            tail: n,
            tailMode: o,
            treeForkCount: c
        } : (p.isBackwards = t, p.rendering = null, p.renderingStartTime = 0, p.last = s, p.tail = n, p.tailMode = o, p.treeForkCount = c)
    }

    function gh(e, t, n) {
        var s = t.pendingProps,
            o = s.revealOrder,
            c = s.tail;
        s = s.children;
        var p = Tt.current,
            v = (p & 2) !== 0;
        if (v ? (p = p & 1 | 2, t.flags |= 128) : p &= 1, K(Tt, p), $t(e, t, s, n), s = Xe ? Vs : 0, !v && e !== null && (e.flags & 128) !== 0) e: for (e = t.child; e !== null;) {
            if (e.tag === 13) e.memoizedState !== null && ph(e, n, t);
            else if (e.tag === 19) ph(e, n, t);
            else if (e.child !== null) {
                e.child.return = e, e = e.child;
                continue
            }
            if (e === t) break e;
            for (; e.sibling === null;) {
                if (e.return === null || e.return === t) break e;
                e = e.return
            }
            e.sibling.return = e.return, e = e.sibling
        }
        switch (o) {
            case "forwards":
                for (n = t.child, o = null; n !== null;) e = n.alternate, e !== null && or(e) === null && (o = n), n = n.sibling;
                n = o, n === null ? (o = t.child, t.child = null) : (o = n.sibling, n.sibling = null), Pc(t, !1, o, n, c, s);
                break;
            case "backwards":
            case "unstable_legacy-backwards":
                for (n = null, o = t.child, t.child = null; o !== null;) {
                    if (e = o.alternate, e !== null && or(e) === null) {
                        t.child = o;
                        break
                    }
                    e = o.sibling, o.sibling = n, n = o, o = e
                }
                Pc(t, !0, n, null, c, s);
                break;
            case "together":
                Pc(t, !1, null, null, void 0, s);
                break;
            default:
                t.memoizedState = null
        }
        return t.child
    }

    function ma(e, t, n) {
        if (e !== null && (t.dependencies = e.dependencies), Ya |= t.lanes, (n & t.childLanes) === 0)
            if (e !== null) {
                if (Pi(e, t, n, !1), (n & t.childLanes) === 0) return null
            } else return null;
        if (e !== null && t.child !== e.child) throw Error(r(153));
        if (t.child !== null) {
            for (e = t.child, n = ra(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null;) e = e.sibling, n = n.sibling = ra(e, e.pendingProps), n.return = t;
            n.sibling = null
        }
        return t.child
    }

    function Fc(e, t) {
        return (e.lanes & t) !== 0 ? !0 : (e = e.dependencies, !!(e !== null && er(e)))
    }

    function Bv(e, t, n) {
        switch (t.tag) {
            case 3:
                Le(t, t.stateNode.containerInfo), za(t, Et, e.memoizedState.cache), vi();
                break;
            case 27:
            case 5:
                yt(t);
                break;
            case 4:
                Le(t, t.stateNode.containerInfo);
                break;
            case 10:
                za(t, t.type, t.memoizedProps.value);
                break;
            case 31:
                if (t.memoizedState !== null) return t.flags |= 128, bc(t), null;
                break;
            case 13:
                var s = t.memoizedState;
                if (s !== null) return s.dehydrated !== null ? (Ba(t), t.flags |= 128, null) : (n & t.child.childLanes) !== 0 ? hh(e, t, n) : (Ba(t), e = ma(e, t, n), e !== null ? e.sibling : null);
                Ba(t);
                break;
            case 19:
                var o = (e.flags & 128) !== 0;
                if (s = (n & t.childLanes) !== 0, s || (Pi(e, t, n, !1), s = (n & t.childLanes) !== 0), o) {
                    if (s) return gh(e, t, n);
                    t.flags |= 128
                }
                if (o = t.memoizedState, o !== null && (o.rendering = null, o.tail = null, o.lastEffect = null), K(Tt, Tt.current), s) break;
                return null;
            case 22:
                return t.lanes = 0, oh(e, t, n, t.pendingProps);
            case 24:
                za(t, Et, e.memoizedState.cache)
        }
        return ma(e, t, n)
    }

    function yh(e, t, n) {
        if (e !== null)
            if (e.memoizedProps !== t.pendingProps) Dt = !0;
            else {
                if (!Fc(e, n) && (t.flags & 128) === 0) return Dt = !1, Bv(e, t, n);
                Dt = (e.flags & 131072) !== 0
            }
        else Dt = !1, Xe && (t.flags & 1048576) !== 0 && Fd(t, Vs, t.index);
        switch (t.lanes = 0, t.tag) {
            case 16:
                e: {
                    var s = t.pendingProps;
                    if (e = Ni(t.elementType), t.type = e, typeof e == "function") ec(e) ? (s = Ai(e, s), t.tag = 1, t = dh(null, t, e, s, n)) : (t.tag = 0, t = qc(null, t, e, s, n));
                    else {
                        if (e != null) {
                            var o = e.$$typeof;
                            if (o === W) {
                                t.tag = 11, t = sh(null, t, e, s, n);
                                break e
                            } else if (o === $) {
                                t.tag = 14, t = lh(null, t, e, s, n);
                                break e
                            }
                        }
                        throw t = ze(e) || e, Error(r(306, t, ""))
                    }
                }
                return t;
            case 0:
                return qc(e, t, t.type, t.pendingProps, n);
            case 1:
                return s = t.type, o = Ai(s, t.pendingProps), dh(e, t, s, o, n);
            case 3:
                e: {
                    if (Le(t, t.stateNode.containerInfo), e === null) throw Error(r(387));s = t.pendingProps;
                    var c = t.memoizedState;o = c.element,
                    pc(e, t),
                    Xs(t, s, null, n);
                    var p = t.memoizedState;
                    if (s = p.cache, za(t, Et, s), s !== c.cache && cc(t, [Et], n, !0), ks(), s = p.element, c.isDehydrated)
                        if (c = {
                                element: s,
                                isDehydrated: !1,
                                cache: p.cache
                            }, t.updateQueue.baseState = c, t.memoizedState = c, t.flags & 256) {
                            t = mh(e, t, s, n);
                            break e
                        } else if (s !== o) {
                        o = En(Error(r(424)), t), Bs(o), t = mh(e, t, s, n);
                        break e
                    } else {
                        switch (e = t.stateNode.containerInfo, e.nodeType) {
                            case 9:
                                e = e.body;
                                break;
                            default:
                                e = e.nodeName === "HTML" ? e.ownerDocument.body : e
                        }
                        for (ct = zn(e.firstChild), Ft = t, Xe = !0, Ra = null, Rn = !0, n = om(t, null, s, n), t.child = n; n;) n.flags = n.flags & -3 | 4096, n = n.sibling
                    } else {
                        if (vi(), s === o) {
                            t = ma(e, t, n);
                            break e
                        }
                        $t(e, t, s, n)
                    }
                    t = t.child
                }
                return t;
            case 26:
                return vr(e, t), e === null ? (n = Ep(t.type, null, t.pendingProps, null)) ? t.memoizedState = n : Xe || (n = t.type, e = t.pendingProps, s = Vr(Te.current).createElement(n), s[Vt] = t, s[tn] = e, It(s, n, e), q(s), t.stateNode = s) : t.memoizedState = Ep(t.type, e.memoizedProps, t.pendingProps, e.memoizedState), null;
            case 27:
                return yt(t), e === null && Xe && (s = t.stateNode = Mp(t.type, t.pendingProps, Te.current), Ft = t, Rn = !0, o = ct, Za(t.type) ? (Eu = o, ct = zn(s.firstChild)) : ct = o), $t(e, t, t.pendingProps.children, n), vr(e, t), e === null && (t.flags |= 4194304), t.child;
            case 5:
                return e === null && Xe && ((o = s = ct) && (s = m1(s, t.type, t.pendingProps, Rn), s !== null ? (t.stateNode = s, Ft = t, ct = zn(s.firstChild), Rn = !1, o = !0) : o = !1), o || Oa(t)), yt(t), o = t.type, c = t.pendingProps, p = e !== null ? e.memoizedProps : null, s = c.children, Nu(o, c) ? s = null : p !== null && Nu(o, p) && (t.flags |= 32), t.memoizedState !== null && (o = Tc(e, t, Ev, null, null, n), ul._currentValue = o), vr(e, t), $t(e, t, s, n), t.child;
            case 6:
                return e === null && Xe && ((e = n = ct) && (n = h1(n, t.pendingProps, Rn), n !== null ? (t.stateNode = n, Ft = t, ct = null, e = !0) : e = !1), e || Oa(t)), null;
            case 13:
                return hh(e, t, n);
            case 4:
                return Le(t, t.stateNode.containerInfo), s = t.pendingProps, e === null ? t.child = Mi(t, null, s, n) : $t(e, t, s, n), t.child;
            case 11:
                return sh(e, t, t.type, t.pendingProps, n);
            case 7:
                return $t(e, t, t.pendingProps, n), t.child;
            case 8:
                return $t(e, t, t.pendingProps.children, n), t.child;
            case 12:
                return $t(e, t, t.pendingProps.children, n), t.child;
            case 10:
                return s = t.pendingProps, za(t, t.type, s.value), $t(e, t, s.children, n), t.child;
            case 9:
                return o = t.type._context, s = t.pendingProps.children, Si(t), o = Jt(o), s = s(o), t.flags |= 1, $t(e, t, s, n), t.child;
            case 14:
                return lh(e, t, t.type, t.pendingProps, n);
            case 15:
                return rh(e, t, t.type, t.pendingProps, n);
            case 19:
                return gh(e, t, n);
            case 31:
                return Vv(e, t, n);
            case 22:
                return oh(e, t, n, t.pendingProps);
            case 24:
                return Si(t), s = Jt(Et), e === null ? (o = dc(), o === null && (o = it, c = uc(), o.pooledCache = c, c.refCount++, c !== null && (o.pooledCacheLanes |= n), o = c), t.memoizedState = {
                    parent: s,
                    cache: o
                }, hc(t), za(t, Et, o)) : ((e.lanes & n) !== 0 && (pc(e, t), Xs(t, null, null, n), ks()), o = e.memoizedState, c = t.memoizedState, o.parent !== s ? (o = {
                    parent: s,
                    cache: s
                }, t.memoizedState = o, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = o), za(t, Et, s)) : (s = c.cache, za(t, Et, s), s !== o.cache && cc(t, [Et], n, !0))), $t(e, t, t.pendingProps.children, n), t.child;
            case 29:
                throw t.pendingProps
        }
        throw Error(r(156, t.tag))
    }

    function ha(e) {
        e.flags |= 4
    }

    function Jc(e, t, n, s, o) {
        if ((t = (e.mode & 32) !== 0) && (t = !1), t) {
            if (e.flags |= 16777216, (o & 335544128) === o)
                if (e.stateNode.complete) e.flags |= 8192;
                else if (Xh()) e.flags |= 8192;
            else throw ji = ir, mc
        } else e.flags &= -16777217
    }

    function xh(e, t) {
        if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0) e.flags &= -16777217;
        else if (e.flags |= 16777216, !zp(t))
            if (Xh()) e.flags |= 8192;
            else throw ji = ir, mc
    }

    function Sr(e, t) {
        t !== null && (e.flags |= 4), e.flags & 16384 && (t = e.tag !== 22 ? Mn() : 536870912, e.lanes |= t, ls |= t)
    }

    function Js(e, t) {
        if (!Xe) switch (e.tailMode) {
            case "hidden":
                t = e.tail;
                for (var n = null; t !== null;) t.alternate !== null && (n = t), t = t.sibling;
                n === null ? e.tail = null : n.sibling = null;
                break;
            case "collapsed":
                n = e.tail;
                for (var s = null; n !== null;) n.alternate !== null && (s = n), n = n.sibling;
                s === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : s.sibling = null
        }
    }

    function ut(e) {
        var t = e.alternate !== null && e.alternate.child === e.child,
            n = 0,
            s = 0;
        if (t)
            for (var o = e.child; o !== null;) n |= o.lanes | o.childLanes, s |= o.subtreeFlags & 65011712, s |= o.flags & 65011712, o.return = e, o = o.sibling;
        else
            for (o = e.child; o !== null;) n |= o.lanes | o.childLanes, s |= o.subtreeFlags, s |= o.flags, o.return = e, o = o.sibling;
        return e.subtreeFlags |= s, e.childLanes = n, t
    }

    function Uv(e, t, n) {
        var s = t.pendingProps;
        switch (ic(t), t.tag) {
            case 16:
            case 15:
            case 0:
            case 11:
            case 7:
            case 8:
            case 12:
            case 9:
            case 14:
                return ut(t), null;
            case 1:
                return ut(t), null;
            case 3:
                return n = t.stateNode, s = null, e !== null && (s = e.memoizedState.cache), t.memoizedState.cache !== s && (t.flags |= 2048), ua(Et), Ee(), n.pendingContext && (n.context = n.pendingContext, n.pendingContext = null), (e === null || e.child === null) && (Qi(t) ? ha(t) : e === null || e.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, lc())), ut(t), null;
            case 26:
                var o = t.type,
                    c = t.memoizedState;
                return e === null ? (ha(t), c !== null ? (ut(t), xh(t, c)) : (ut(t), Jc(t, o, null, s, n))) : c ? c !== e.memoizedState ? (ha(t), ut(t), xh(t, c)) : (ut(t), t.flags &= -16777217) : (e = e.memoizedProps, e !== s && ha(t), ut(t), Jc(t, o, e, s, n)), null;
            case 27:
                if (Zt(t), n = Te.current, o = t.type, e !== null && t.stateNode != null) e.memoizedProps !== s && ha(t);
                else {
                    if (!s) {
                        if (t.stateNode === null) throw Error(r(166));
                        return ut(t), null
                    }
                    e = re.current, Qi(t) ? $d(t) : (e = Mp(o, s, n), t.stateNode = e, ha(t))
                }
                return ut(t), null;
            case 5:
                if (Zt(t), o = t.type, e !== null && t.stateNode != null) e.memoizedProps !== s && ha(t);
                else {
                    if (!s) {
                        if (t.stateNode === null) throw Error(r(166));
                        return ut(t), null
                    }
                    if (c = re.current, Qi(t)) $d(t);
                    else {
                        var p = Vr(Te.current);
                        switch (c) {
                            case 1:
                                c = p.createElementNS("http://www.w3.org/2000/svg", o);
                                break;
                            case 2:
                                c = p.createElementNS("http://www.w3.org/1998/Math/MathML", o);
                                break;
                            default:
                                switch (o) {
                                    case "svg":
                                        c = p.createElementNS("http://www.w3.org/2000/svg", o);
                                        break;
                                    case "math":
                                        c = p.createElementNS("http://www.w3.org/1998/Math/MathML", o);
                                        break;
                                    case "script":
                                        c = p.createElement("div"), c.innerHTML = "<script><\/script>", c = c.removeChild(c.firstChild);
                                        break;
                                    case "select":
                                        c = typeof s.is == "string" ? p.createElement("select", {
                                            is: s.is
                                        }) : p.createElement("select"), s.multiple ? c.multiple = !0 : s.size && (c.size = s.size);
                                        break;
                                    default:
                                        c = typeof s.is == "string" ? p.createElement(o, {
                                            is: s.is
                                        }) : p.createElement(o)
                                }
                        }
                        c[Vt] = t, c[tn] = s;
                        e: for (p = t.child; p !== null;) {
                            if (p.tag === 5 || p.tag === 6) c.appendChild(p.stateNode);
                            else if (p.tag !== 4 && p.tag !== 27 && p.child !== null) {
                                p.child.return = p, p = p.child;
                                continue
                            }
                            if (p === t) break e;
                            for (; p.sibling === null;) {
                                if (p.return === null || p.return === t) break e;
                                p = p.return
                            }
                            p.sibling.return = p.return, p = p.sibling
                        }
                        t.stateNode = c;
                        e: switch (It(c, o, s), o) {
                            case "button":
                            case "input":
                            case "select":
                            case "textarea":
                                s = !!s.autoFocus;
                                break e;
                            case "img":
                                s = !0;
                                break e;
                            default:
                                s = !1
                        }
                        s && ha(t)
                    }
                }
                return ut(t), Jc(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, n), null;
            case 6:
                if (e && t.stateNode != null) e.memoizedProps !== s && ha(t);
                else {
                    if (typeof s != "string" && t.stateNode === null) throw Error(r(166));
                    if (e = Te.current, Qi(t)) {
                        if (e = t.stateNode, n = t.memoizedProps, s = null, o = Ft, o !== null) switch (o.tag) {
                            case 27:
                            case 5:
                                s = o.memoizedProps
                        }
                        e[Vt] = t, e = !!(e.nodeValue === n || s !== null && s.suppressHydrationWarning === !0 || hp(e.nodeValue, n)), e || Oa(t, !0)
                    } else e = Vr(e).createTextNode(s), e[Vt] = t, t.stateNode = e
                }
                return ut(t), null;
            case 31:
                if (n = t.memoizedState, e === null || e.memoizedState !== null) {
                    if (s = Qi(t), n !== null) {
                        if (e === null) {
                            if (!s) throw Error(r(318));
                            if (e = t.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(r(557));
                            e[Vt] = t
                        } else vi(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
                        ut(t), e = !1
                    } else n = lc(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = n), e = !0;
                    if (!e) return t.flags & 256 ? (xn(t), t) : (xn(t), null);
                    if ((t.flags & 128) !== 0) throw Error(r(558))
                }
                return ut(t), null;
            case 13:
                if (s = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
                    if (o = Qi(t), s !== null && s.dehydrated !== null) {
                        if (e === null) {
                            if (!o) throw Error(r(318));
                            if (o = t.memoizedState, o = o !== null ? o.dehydrated : null, !o) throw Error(r(317));
                            o[Vt] = t
                        } else vi(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
                        ut(t), o = !1
                    } else o = lc(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = o), o = !0;
                    if (!o) return t.flags & 256 ? (xn(t), t) : (xn(t), null)
                }
                return xn(t), (t.flags & 128) !== 0 ? (t.lanes = n, t) : (n = s !== null, e = e !== null && e.memoizedState !== null, n && (s = t.child, o = null, s.alternate !== null && s.alternate.memoizedState !== null && s.alternate.memoizedState.cachePool !== null && (o = s.alternate.memoizedState.cachePool.pool), c = null, s.memoizedState !== null && s.memoizedState.cachePool !== null && (c = s.memoizedState.cachePool.pool), c !== o && (s.flags |= 2048)), n !== e && n && (t.child.flags |= 8192), Sr(t, t.updateQueue), ut(t), null);
            case 4:
                return Ee(), e === null && xu(t.stateNode.containerInfo), ut(t), null;
            case 10:
                return ua(t.type), ut(t), null;
            case 19:
                if (X(Tt), s = t.memoizedState, s === null) return ut(t), null;
                if (o = (t.flags & 128) !== 0, c = s.rendering, c === null)
                    if (o) Js(s, !1);
                    else {
                        if (vt !== 0 || e !== null && (e.flags & 128) !== 0)
                            for (e = t.child; e !== null;) {
                                if (c = or(e), c !== null) {
                                    for (t.flags |= 128, Js(s, !1), e = c.updateQueue, t.updateQueue = e, Sr(t, e), t.subtreeFlags = 0, e = n, n = t.child; n !== null;) Zd(n, e), n = n.sibling;
                                    return K(Tt, Tt.current & 1 | 2), Xe && oa(t, s.treeForkCount), t.child
                                }
                                e = e.sibling
                            }
                        s.tail !== null && pt() > wr && (t.flags |= 128, o = !0, Js(s, !1), t.lanes = 4194304)
                    }
                else {
                    if (!o)
                        if (e = or(c), e !== null) {
                            if (t.flags |= 128, o = !0, e = e.updateQueue, t.updateQueue = e, Sr(t, e), Js(s, !0), s.tail === null && s.tailMode === "hidden" && !c.alternate && !Xe) return ut(t), null
                        } else 2 * pt() - s.renderingStartTime > wr && n !== 536870912 && (t.flags |= 128, o = !0, Js(s, !1), t.lanes = 4194304);
                    s.isBackwards ? (c.sibling = t.child, t.child = c) : (e = s.last, e !== null ? e.sibling = c : t.child = c, s.last = c)
                }
                return s.tail !== null ? (e = s.tail, s.rendering = e, s.tail = e.sibling, s.renderingStartTime = pt(), e.sibling = null, n = Tt.current, K(Tt, o ? n & 1 | 2 : n & 1), Xe && oa(t, s.treeForkCount), e) : (ut(t), null);
            case 22:
            case 23:
                return xn(t), vc(), s = t.memoizedState !== null, e !== null ? e.memoizedState !== null !== s && (t.flags |= 8192) : s && (t.flags |= 8192), s ? (n & 536870912) !== 0 && (t.flags & 128) === 0 && (ut(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : ut(t), n = t.updateQueue, n !== null && Sr(t, n.retryQueue), n = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), s = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (s = t.memoizedState.cachePool.pool), s !== n && (t.flags |= 2048), e !== null && X(Ti), null;
            case 24:
                return n = null, e !== null && (n = e.memoizedState.cache), t.memoizedState.cache !== n && (t.flags |= 2048), ua(Et), ut(t), null;
            case 25:
                return null;
            case 30:
                return null
        }
        throw Error(r(156, t.tag))
    }

    function Hv(e, t) {
        switch (ic(t), t.tag) {
            case 1:
                return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
            case 3:
                return ua(Et), Ee(), e = t.flags, (e & 65536) !== 0 && (e & 128) === 0 ? (t.flags = e & -65537 | 128, t) : null;
            case 26:
            case 27:
            case 5:
                return Zt(t), null;
            case 31:
                if (t.memoizedState !== null) {
                    if (xn(t), t.alternate === null) throw Error(r(340));
                    vi()
                }
                return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
            case 13:
                if (xn(t), e = t.memoizedState, e !== null && e.dehydrated !== null) {
                    if (t.alternate === null) throw Error(r(340));
                    vi()
                }
                return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
            case 19:
                return X(Tt), null;
            case 4:
                return Ee(), null;
            case 10:
                return ua(t.type), null;
            case 22:
            case 23:
                return xn(t), vc(), e !== null && X(Ti), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
            case 24:
                return ua(Et), null;
            case 25:
                return null;
            default:
                return null
        }
    }

    function vh(e, t) {
        switch (ic(t), t.tag) {
            case 3:
                ua(Et), Ee();
                break;
            case 26:
            case 27:
            case 5:
                Zt(t);
                break;
            case 4:
                Ee();
                break;
            case 31:
                t.memoizedState !== null && xn(t);
                break;
            case 13:
                xn(t);
                break;
            case 19:
                X(Tt);
                break;
            case 10:
                ua(t.type);
                break;
            case 22:
            case 23:
                xn(t), vc(), e !== null && X(Ti);
                break;
            case 24:
                ua(Et)
        }
    }

    function $s(e, t) {
        try {
            var n = t.updateQueue,
                s = n !== null ? n.lastEffect : null;
            if (s !== null) {
                var o = s.next;
                n = o;
                do {
                    if ((n.tag & e) === e) {
                        s = void 0;
                        var c = n.create,
                            p = n.inst;
                        s = c(), p.destroy = s
                    }
                    n = n.next
                } while (n !== o)
            }
        } catch (v) {
            Ie(t, t.return, v)
        }
    }

    function Ha(e, t, n) {
        try {
            var s = t.updateQueue,
                o = s !== null ? s.lastEffect : null;
            if (o !== null) {
                var c = o.next;
                s = c;
                do {
                    if ((s.tag & e) === e) {
                        var p = s.inst,
                            v = p.destroy;
                        if (v !== void 0) {
                            p.destroy = void 0, o = t;
                            var N = n,
                                _ = v;
                            try {
                                _()
                            } catch (k) {
                                Ie(o, N, k)
                            }
                        }
                    }
                    s = s.next
                } while (s !== c)
            }
        } catch (k) {
            Ie(t, t.return, k)
        }
    }

    function bh(e) {
        var t = e.updateQueue;
        if (t !== null) {
            var n = e.stateNode;
            try {
                um(t, n)
            } catch (s) {
                Ie(e, e.return, s)
            }
        }
    }

    function Sh(e, t, n) {
        n.props = Ai(e.type, e.memoizedProps), n.state = e.memoizedState;
        try {
            n.componentWillUnmount()
        } catch (s) {
            Ie(e, t, s)
        }
    }

    function Is(e, t) {
        try {
            var n = e.ref;
            if (n !== null) {
                switch (e.tag) {
                    case 26:
                    case 27:
                    case 5:
                        var s = e.stateNode;
                        break;
                    case 30:
                        s = e.stateNode;
                        break;
                    default:
                        s = e.stateNode
                }
                typeof n == "function" ? e.refCleanup = n(s) : n.current = s
            }
        } catch (o) {
            Ie(e, t, o)
        }
    }

    function $n(e, t) {
        var n = e.ref,
            s = e.refCleanup;
        if (n !== null)
            if (typeof s == "function") try {
                s()
            } catch (o) {
                Ie(e, t, o)
            } finally {
                e.refCleanup = null, e = e.alternate, e != null && (e.refCleanup = null)
            } else if (typeof n == "function") try {
                n(null)
            } catch (o) {
                Ie(e, t, o)
            } else n.current = null
    }

    function Th(e) {
        var t = e.type,
            n = e.memoizedProps,
            s = e.stateNode;
        try {
            e: switch (t) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                    n.autoFocus && s.focus();
                    break e;
                case "img":
                    n.src ? s.src = n.src : n.srcSet && (s.srcset = n.srcSet)
            }
        }
        catch (o) {
            Ie(e, e.return, o)
        }
    }

    function $c(e, t, n) {
        try {
            var s = e.stateNode;
            r1(s, e.type, n, t), s[tn] = t
        } catch (o) {
            Ie(e, e.return, o)
        }
    }

    function Nh(e) {
        return e.tag === 5 || e.tag === 3 || e.tag === 26 || e.tag === 27 && Za(e.type) || e.tag === 4
    }

    function Ic(e) {
        e: for (;;) {
            for (; e.sibling === null;) {
                if (e.return === null || Nh(e.return)) return null;
                e = e.return
            }
            for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18;) {
                if (e.tag === 27 && Za(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue e;
                e.child.return = e, e = e.child
            }
            if (!(e.flags & 2)) return e.stateNode
        }
    }

    function Wc(e, t, n) {
        var s = e.tag;
        if (s === 5 || s === 6) e = e.stateNode, t ? (n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n).insertBefore(e, t) : (t = n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n, t.appendChild(e), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = sa));
        else if (s !== 4 && (s === 27 && Za(e.type) && (n = e.stateNode, t = null), e = e.child, e !== null))
            for (Wc(e, t, n), e = e.sibling; e !== null;) Wc(e, t, n), e = e.sibling
    }

    function Tr(e, t, n) {
        var s = e.tag;
        if (s === 5 || s === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
        else if (s !== 4 && (s === 27 && Za(e.type) && (n = e.stateNode), e = e.child, e !== null))
            for (Tr(e, t, n), e = e.sibling; e !== null;) Tr(e, t, n), e = e.sibling
    }

    function jh(e) {
        var t = e.stateNode,
            n = e.memoizedProps;
        try {
            for (var s = e.type, o = t.attributes; o.length;) t.removeAttributeNode(o[0]);
            It(t, s, n), t[Vt] = e, t[tn] = n
        } catch (c) {
            Ie(e, e.return, c)
        }
    }
    var pa = !1,
        Rt = !1,
        eu = !1,
        Mh = typeof WeakSet == "function" ? WeakSet : Set,
        Kt = null;

    function Gv(e, t) {
        if (e = e.containerInfo, Su = kr, e = Bd(e), Qo(e)) {
            if ("selectionStart" in e) var n = {
                start: e.selectionStart,
                end: e.selectionEnd
            };
            else e: {
                n = (n = e.ownerDocument) && n.defaultView || window;
                var s = n.getSelection && n.getSelection();
                if (s && s.rangeCount !== 0) {
                    n = s.anchorNode;
                    var o = s.anchorOffset,
                        c = s.focusNode;
                    s = s.focusOffset;
                    try {
                        n.nodeType, c.nodeType
                    } catch {
                        n = null;
                        break e
                    }
                    var p = 0,
                        v = -1,
                        N = -1,
                        _ = 0,
                        k = 0,
                        Q = e,
                        L = null;
                    t: for (;;) {
                        for (var B; Q !== n || o !== 0 && Q.nodeType !== 3 || (v = p + o), Q !== c || s !== 0 && Q.nodeType !== 3 || (N = p + s), Q.nodeType === 3 && (p += Q.nodeValue.length), (B = Q.firstChild) !== null;) L = Q, Q = B;
                        for (;;) {
                            if (Q === e) break t;
                            if (L === n && ++_ === o && (v = p), L === c && ++k === s && (N = p), (B = Q.nextSibling) !== null) break;
                            Q = L, L = Q.parentNode
                        }
                        Q = B
                    }
                    n = v === -1 || N === -1 ? null : {
                        start: v,
                        end: N
                    }
                } else n = null
            }
            n = n || {
                start: 0,
                end: 0
            }
        } else n = null;
        for (Tu = {
                focusedElem: e,
                selectionRange: n
            }, kr = !1, Kt = t; Kt !== null;)
            if (t = Kt, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null) e.return = t, Kt = e;
            else
                for (; Kt !== null;) {
                    switch (t = Kt, c = t.alternate, e = t.flags, t.tag) {
                        case 0:
                            if ((e & 4) !== 0 && (e = t.updateQueue, e = e !== null ? e.events : null, e !== null))
                                for (n = 0; n < e.length; n++) o = e[n], o.ref.impl = o.nextImpl;
                            break;
                        case 11:
                        case 15:
                            break;
                        case 1:
                            if ((e & 1024) !== 0 && c !== null) {
                                e = void 0, n = t, o = c.memoizedProps, c = c.memoizedState, s = n.stateNode;
                                try {
                                    var ue = Ai(n.type, o);
                                    e = s.getSnapshotBeforeUpdate(ue, c), s.__reactInternalSnapshotBeforeUpdate = e
                                } catch (je) {
                                    Ie(n, n.return, je)
                                }
                            }
                            break;
                        case 3:
                            if ((e & 1024) !== 0) {
                                if (e = t.stateNode.containerInfo, n = e.nodeType, n === 9) Mu(e);
                                else if (n === 1) switch (e.nodeName) {
                                    case "HEAD":
                                    case "HTML":
                                    case "BODY":
                                        Mu(e);
                                        break;
                                    default:
                                        e.textContent = ""
                                }
                            }
                            break;
                        case 5:
                        case 26:
                        case 27:
                        case 6:
                        case 4:
                        case 17:
                            break;
                        default:
                            if ((e & 1024) !== 0) throw Error(r(163))
                    }
                    if (e = t.sibling, e !== null) {
                        e.return = t.return, Kt = e;
                        break
                    }
                    Kt = t.return
                }
    }

    function wh(e, t, n) {
        var s = n.flags;
        switch (n.tag) {
            case 0:
            case 11:
            case 15:
                ya(e, n), s & 4 && $s(5, n);
                break;
            case 1:
                if (ya(e, n), s & 4)
                    if (e = n.stateNode, t === null) try {
                        e.componentDidMount()
                    } catch (p) {
                        Ie(n, n.return, p)
                    } else {
                        var o = Ai(n.type, t.memoizedProps);
                        t = t.memoizedState;
                        try {
                            e.componentDidUpdate(o, t, e.__reactInternalSnapshotBeforeUpdate)
                        } catch (p) {
                            Ie(n, n.return, p)
                        }
                    }
                s & 64 && bh(n), s & 512 && Is(n, n.return);
                break;
            case 3:
                if (ya(e, n), s & 64 && (e = n.updateQueue, e !== null)) {
                    if (t = null, n.child !== null) switch (n.child.tag) {
                        case 27:
                        case 5:
                            t = n.child.stateNode;
                            break;
                        case 1:
                            t = n.child.stateNode
                    }
                    try {
                        um(e, t)
                    } catch (p) {
                        Ie(n, n.return, p)
                    }
                }
                break;
            case 27:
                t === null && s & 4 && jh(n);
            case 26:
            case 5:
                ya(e, n), t === null && s & 4 && Th(n), s & 512 && Is(n, n.return);
                break;
            case 12:
                ya(e, n);
                break;
            case 31:
                ya(e, n), s & 4 && Ch(e, n);
                break;
            case 13:
                ya(e, n), s & 4 && Dh(e, n), s & 64 && (e = n.memoizedState, e !== null && (e = e.dehydrated, e !== null && (n = Fv.bind(null, n), p1(e, n))));
                break;
            case 22:
                if (s = n.memoizedState !== null || pa, !s) {
                    t = t !== null && t.memoizedState !== null || Rt, o = pa;
                    var c = Rt;
                    pa = s, (Rt = t) && !c ? xa(e, n, (n.subtreeFlags & 8772) !== 0) : ya(e, n), pa = o, Rt = c
                }
                break;
            case 30:
                break;
            default:
                ya(e, n)
        }
    }

    function Ah(e) {
        var t = e.alternate;
        t !== null && (e.alternate = null, Ah(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && C(t)), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null
    }
    var ht = null,
        un = !1;

    function ga(e, t, n) {
        for (n = n.child; n !== null;) Eh(e, t, n), n = n.sibling
    }

    function Eh(e, t, n) {
        if (Mt && typeof Mt.onCommitFiberUnmount == "function") try {
            Mt.onCommitFiberUnmount(ie, n)
        } catch {}
        switch (n.tag) {
            case 26:
                Rt || $n(n, t), ga(e, t, n), n.memoizedState ? n.memoizedState.count-- : n.stateNode && (n = n.stateNode, n.parentNode.removeChild(n));
                break;
            case 27:
                Rt || $n(n, t);
                var s = ht,
                    o = un;
                Za(n.type) && (ht = n.stateNode, un = !1), ga(e, t, n), rl(n.stateNode), ht = s, un = o;
                break;
            case 5:
                Rt || $n(n, t);
            case 6:
                if (s = ht, o = un, ht = null, ga(e, t, n), ht = s, un = o, ht !== null)
                    if (un) try {
                        (ht.nodeType === 9 ? ht.body : ht.nodeName === "HTML" ? ht.ownerDocument.body : ht).removeChild(n.stateNode)
                    } catch (c) {
                        Ie(n, t, c)
                    } else try {
                        ht.removeChild(n.stateNode)
                    } catch (c) {
                        Ie(n, t, c)
                    }
                break;
            case 18:
                ht !== null && (un ? (e = ht, bp(e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, n.stateNode), hs(e)) : bp(ht, n.stateNode));
                break;
            case 4:
                s = ht, o = un, ht = n.stateNode.containerInfo, un = !0, ga(e, t, n), ht = s, un = o;
                break;
            case 0:
            case 11:
            case 14:
            case 15:
                Ha(2, n, t), Rt || Ha(4, n, t), ga(e, t, n);
                break;
            case 1:
                Rt || ($n(n, t), s = n.stateNode, typeof s.componentWillUnmount == "function" && Sh(n, t, s)), ga(e, t, n);
                break;
            case 21:
                ga(e, t, n);
                break;
            case 22:
                Rt = (s = Rt) || n.memoizedState !== null, ga(e, t, n), Rt = s;
                break;
            default:
                ga(e, t, n)
        }
    }

    function Ch(e, t) {
        if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null))) {
            e = e.dehydrated;
            try {
                hs(e)
            } catch (n) {
                Ie(t, t.return, n)
            }
        }
    }

    function Dh(e, t) {
        if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null && (e = e.dehydrated, e !== null)))) try {
            hs(e)
        } catch (n) {
            Ie(t, t.return, n)
        }
    }

    function Yv(e) {
        switch (e.tag) {
            case 31:
            case 13:
            case 19:
                var t = e.stateNode;
                return t === null && (t = e.stateNode = new Mh), t;
            case 22:
                return e = e.stateNode, t = e._retryCache, t === null && (t = e._retryCache = new Mh), t;
            default:
                throw Error(r(435, e.tag))
        }
    }

    function Nr(e, t) {
        var n = Yv(e);
        t.forEach(function(s) {
            if (!n.has(s)) {
                n.add(s);
                var o = Jv.bind(null, e, s);
                s.then(o, o)
            }
        })
    }

    function fn(e, t) {
        var n = t.deletions;
        if (n !== null)
            for (var s = 0; s < n.length; s++) {
                var o = n[s],
                    c = e,
                    p = t,
                    v = p;
                e: for (; v !== null;) {
                    switch (v.tag) {
                        case 27:
                            if (Za(v.type)) {
                                ht = v.stateNode, un = !1;
                                break e
                            }
                            break;
                        case 5:
                            ht = v.stateNode, un = !1;
                            break e;
                        case 3:
                        case 4:
                            ht = v.stateNode.containerInfo, un = !0;
                            break e
                    }
                    v = v.return
                }
                if (ht === null) throw Error(r(160));
                Eh(c, p, o), ht = null, un = !1, c = o.alternate, c !== null && (c.return = null), o.return = null
            }
        if (t.subtreeFlags & 13886)
            for (t = t.child; t !== null;) Rh(t, e), t = t.sibling
    }
    var Yn = null;

    function Rh(e, t) {
        var n = e.alternate,
            s = e.flags;
        switch (e.tag) {
            case 0:
            case 11:
            case 14:
            case 15:
                fn(t, e), dn(e), s & 4 && (Ha(3, e, e.return), $s(3, e), Ha(5, e, e.return));
                break;
            case 1:
                fn(t, e), dn(e), s & 512 && (Rt || n === null || $n(n, n.return)), s & 64 && pa && (e = e.updateQueue, e !== null && (s = e.callbacks, s !== null && (n = e.shared.hiddenCallbacks, e.shared.hiddenCallbacks = n === null ? s : n.concat(s))));
                break;
            case 26:
                var o = Yn;
                if (fn(t, e), dn(e), s & 512 && (Rt || n === null || $n(n, n.return)), s & 4) {
                    var c = n !== null ? n.memoizedState : null;
                    if (s = e.memoizedState, n === null)
                        if (s === null)
                            if (e.stateNode === null) {
                                e: {
                                    s = e.type,
                                    n = e.memoizedProps,
                                    o = o.ownerDocument || o;t: switch (s) {
                                        case "title":
                                            c = o.getElementsByTagName("title")[0], (!c || c[wa] || c[Vt] || c.namespaceURI === "http://www.w3.org/2000/svg" || c.hasAttribute("itemprop")) && (c = o.createElement(s), o.head.insertBefore(c, o.querySelector("head > title"))), It(c, s, n), c[Vt] = e, q(c), s = c;
                                            break e;
                                        case "link":
                                            var p = Rp("link", "href", o).get(s + (n.href || ""));
                                            if (p) {
                                                for (var v = 0; v < p.length; v++)
                                                    if (c = p[v], c.getAttribute("href") === (n.href == null || n.href === "" ? null : n.href) && c.getAttribute("rel") === (n.rel == null ? null : n.rel) && c.getAttribute("title") === (n.title == null ? null : n.title) && c.getAttribute("crossorigin") === (n.crossOrigin == null ? null : n.crossOrigin)) {
                                                        p.splice(v, 1);
                                                        break t
                                                    }
                                            }
                                            c = o.createElement(s), It(c, s, n), o.head.appendChild(c);
                                            break;
                                        case "meta":
                                            if (p = Rp("meta", "content", o).get(s + (n.content || ""))) {
                                                for (v = 0; v < p.length; v++)
                                                    if (c = p[v], c.getAttribute("content") === (n.content == null ? null : "" + n.content) && c.getAttribute("name") === (n.name == null ? null : n.name) && c.getAttribute("property") === (n.property == null ? null : n.property) && c.getAttribute("http-equiv") === (n.httpEquiv == null ? null : n.httpEquiv) && c.getAttribute("charset") === (n.charSet == null ? null : n.charSet)) {
                                                        p.splice(v, 1);
                                                        break t
                                                    }
                                            }
                                            c = o.createElement(s), It(c, s, n), o.head.appendChild(c);
                                            break;
                                        default:
                                            throw Error(r(468, s))
                                    }
                                    c[Vt] = e,
                                    q(c),
                                    s = c
                                }
                                e.stateNode = s
                            }
                    else Op(o, e.type, e.stateNode);
                    else e.stateNode = Dp(o, s, e.memoizedProps);
                    else c !== s ? (c === null ? n.stateNode !== null && (n = n.stateNode, n.parentNode.removeChild(n)) : c.count--, s === null ? Op(o, e.type, e.stateNode) : Dp(o, s, e.memoizedProps)) : s === null && e.stateNode !== null && $c(e, e.memoizedProps, n.memoizedProps)
                }
                break;
            case 27:
                fn(t, e), dn(e), s & 512 && (Rt || n === null || $n(n, n.return)), n !== null && s & 4 && $c(e, e.memoizedProps, n.memoizedProps);
                break;
            case 5:
                if (fn(t, e), dn(e), s & 512 && (Rt || n === null || $n(n, n.return)), e.flags & 32) {
                    o = e.stateNode;
                    try {
                        wn(o, "")
                    } catch (ue) {
                        Ie(e, e.return, ue)
                    }
                }
                s & 4 && e.stateNode != null && (o = e.memoizedProps, $c(e, o, n !== null ? n.memoizedProps : o)), s & 1024 && (eu = !0);
                break;
            case 6:
                if (fn(t, e), dn(e), s & 4) {
                    if (e.stateNode === null) throw Error(r(162));
                    s = e.memoizedProps, n = e.stateNode;
                    try {
                        n.nodeValue = s
                    } catch (ue) {
                        Ie(e, e.return, ue)
                    }
                }
                break;
            case 3:
                if (Hr = null, o = Yn, Yn = Br(t.containerInfo), fn(t, e), Yn = o, dn(e), s & 4 && n !== null && n.memoizedState.isDehydrated) try {
                    hs(t.containerInfo)
                } catch (ue) {
                    Ie(e, e.return, ue)
                }
                eu && (eu = !1, Oh(e));
                break;
            case 4:
                s = Yn, Yn = Br(e.stateNode.containerInfo), fn(t, e), dn(e), Yn = s;
                break;
            case 12:
                fn(t, e), dn(e);
                break;
            case 31:
                fn(t, e), dn(e), s & 4 && (s = e.updateQueue, s !== null && (e.updateQueue = null, Nr(e, s)));
                break;
            case 13:
                fn(t, e), dn(e), e.child.flags & 8192 && e.memoizedState !== null != (n !== null && n.memoizedState !== null) && (Mr = pt()), s & 4 && (s = e.updateQueue, s !== null && (e.updateQueue = null, Nr(e, s)));
                break;
            case 22:
                o = e.memoizedState !== null;
                var N = n !== null && n.memoizedState !== null,
                    _ = pa,
                    k = Rt;
                if (pa = _ || o, Rt = k || N, fn(t, e), Rt = k, pa = _, dn(e), s & 8192) e: for (t = e.stateNode, t._visibility = o ? t._visibility & -2 : t._visibility | 1, o && (n === null || N || pa || Rt || Ei(e)), n = null, t = e;;) {
                    if (t.tag === 5 || t.tag === 26) {
                        if (n === null) {
                            N = n = t;
                            try {
                                if (c = N.stateNode, o) p = c.style, typeof p.setProperty == "function" ? p.setProperty("display", "none", "important") : p.display = "none";
                                else {
                                    v = N.stateNode;
                                    var Q = N.memoizedProps.style,
                                        L = Q != null && Q.hasOwnProperty("display") ? Q.display : null;
                                    v.style.display = L == null || typeof L == "boolean" ? "" : ("" + L).trim()
                                }
                            } catch (ue) {
                                Ie(N, N.return, ue)
                            }
                        }
                    } else if (t.tag === 6) {
                        if (n === null) {
                            N = t;
                            try {
                                N.stateNode.nodeValue = o ? "" : N.memoizedProps
                            } catch (ue) {
                                Ie(N, N.return, ue)
                            }
                        }
                    } else if (t.tag === 18) {
                        if (n === null) {
                            N = t;
                            try {
                                var B = N.stateNode;
                                o ? Sp(B, !0) : Sp(N.stateNode, !1)
                            } catch (ue) {
                                Ie(N, N.return, ue)
                            }
                        }
                    } else if ((t.tag !== 22 && t.tag !== 23 || t.memoizedState === null || t === e) && t.child !== null) {
                        t.child.return = t, t = t.child;
                        continue
                    }
                    if (t === e) break e;
                    for (; t.sibling === null;) {
                        if (t.return === null || t.return === e) break e;
                        n === t && (n = null), t = t.return
                    }
                    n === t && (n = null), t.sibling.return = t.return, t = t.sibling
                }
                s & 4 && (s = e.updateQueue, s !== null && (n = s.retryQueue, n !== null && (s.retryQueue = null, Nr(e, n))));
                break;
            case 19:
                fn(t, e), dn(e), s & 4 && (s = e.updateQueue, s !== null && (e.updateQueue = null, Nr(e, s)));
                break;
            case 30:
                break;
            case 21:
                break;
            default:
                fn(t, e), dn(e)
        }
    }

    function dn(e) {
        var t = e.flags;
        if (t & 2) {
            try {
                for (var n, s = e.return; s !== null;) {
                    if (Nh(s)) {
                        n = s;
                        break
                    }
                    s = s.return
                }
                if (n == null) throw Error(r(160));
                switch (n.tag) {
                    case 27:
                        var o = n.stateNode,
                            c = Ic(e);
                        Tr(e, c, o);
                        break;
                    case 5:
                        var p = n.stateNode;
                        n.flags & 32 && (wn(p, ""), n.flags &= -33);
                        var v = Ic(e);
                        Tr(e, v, p);
                        break;
                    case 3:
                    case 4:
                        var N = n.stateNode.containerInfo,
                            _ = Ic(e);
                        Wc(e, _, N);
                        break;
                    default:
                        throw Error(r(161))
                }
            } catch (k) {
                Ie(e, e.return, k)
            }
            e.flags &= -3
        }
        t & 4096 && (e.flags &= -4097)
    }

    function Oh(e) {
        if (e.subtreeFlags & 1024)
            for (e = e.child; e !== null;) {
                var t = e;
                Oh(t), t.tag === 5 && t.flags & 1024 && t.stateNode.reset(), e = e.sibling
            }
    }

    function ya(e, t) {
        if (t.subtreeFlags & 8772)
            for (t = t.child; t !== null;) wh(e, t.alternate, t), t = t.sibling
    }

    function Ei(e) {
        for (e = e.child; e !== null;) {
            var t = e;
            switch (t.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                    Ha(4, t, t.return), Ei(t);
                    break;
                case 1:
                    $n(t, t.return);
                    var n = t.stateNode;
                    typeof n.componentWillUnmount == "function" && Sh(t, t.return, n), Ei(t);
                    break;
                case 27:
                    rl(t.stateNode);
                case 26:
                case 5:
                    $n(t, t.return), Ei(t);
                    break;
                case 22:
                    t.memoizedState === null && Ei(t);
                    break;
                case 30:
                    Ei(t);
                    break;
                default:
                    Ei(t)
            }
            e = e.sibling
        }
    }

    function xa(e, t, n) {
        for (n = n && (t.subtreeFlags & 8772) !== 0, t = t.child; t !== null;) {
            var s = t.alternate,
                o = e,
                c = t,
                p = c.flags;
            switch (c.tag) {
                case 0:
                case 11:
                case 15:
                    xa(o, c, n), $s(4, c);
                    break;
                case 1:
                    if (xa(o, c, n), s = c, o = s.stateNode, typeof o.componentDidMount == "function") try {
                        o.componentDidMount()
                    } catch (_) {
                        Ie(s, s.return, _)
                    }
                    if (s = c, o = s.updateQueue, o !== null) {
                        var v = s.stateNode;
                        try {
                            var N = o.shared.hiddenCallbacks;
                            if (N !== null)
                                for (o.shared.hiddenCallbacks = null, o = 0; o < N.length; o++) cm(N[o], v)
                        } catch (_) {
                            Ie(s, s.return, _)
                        }
                    }
                    n && p & 64 && bh(c), Is(c, c.return);
                    break;
                case 27:
                    jh(c);
                case 26:
                case 5:
                    xa(o, c, n), n && s === null && p & 4 && Th(c), Is(c, c.return);
                    break;
                case 12:
                    xa(o, c, n);
                    break;
                case 31:
                    xa(o, c, n), n && p & 4 && Ch(o, c);
                    break;
                case 13:
                    xa(o, c, n), n && p & 4 && Dh(o, c);
                    break;
                case 22:
                    c.memoizedState === null && xa(o, c, n), Is(c, c.return);
                    break;
                case 30:
                    break;
                default:
                    xa(o, c, n)
            }
            t = t.sibling
        }
    }

    function tu(e, t) {
        var n = null;
        e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== n && (e != null && e.refCount++, n != null && Us(n))
    }

    function nu(e, t) {
        e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && Us(e))
    }

    function qn(e, t, n, s) {
        if (t.subtreeFlags & 10256)
            for (t = t.child; t !== null;) zh(e, t, n, s), t = t.sibling
    }

    function zh(e, t, n, s) {
        var o = t.flags;
        switch (t.tag) {
            case 0:
            case 11:
            case 15:
                qn(e, t, n, s), o & 2048 && $s(9, t);
                break;
            case 1:
                qn(e, t, n, s);
                break;
            case 3:
                qn(e, t, n, s), o & 2048 && (e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && Us(e)));
                break;
            case 12:
                if (o & 2048) {
                    qn(e, t, n, s), e = t.stateNode;
                    try {
                        var c = t.memoizedProps,
                            p = c.id,
                            v = c.onPostCommit;
                        typeof v == "function" && v(p, t.alternate === null ? "mount" : "update", e.passiveEffectDuration, -0)
                    } catch (N) {
                        Ie(t, t.return, N)
                    }
                } else qn(e, t, n, s);
                break;
            case 31:
                qn(e, t, n, s);
                break;
            case 13:
                qn(e, t, n, s);
                break;
            case 23:
                break;
            case 22:
                c = t.stateNode, p = t.alternate, t.memoizedState !== null ? c._visibility & 2 ? qn(e, t, n, s) : Ws(e, t) : c._visibility & 2 ? qn(e, t, n, s) : (c._visibility |= 2, as(e, t, n, s, (t.subtreeFlags & 10256) !== 0 || !1)), o & 2048 && tu(p, t);
                break;
            case 24:
                qn(e, t, n, s), o & 2048 && nu(t.alternate, t);
                break;
            default:
                qn(e, t, n, s)
        }
    }

    function as(e, t, n, s, o) {
        for (o = o && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null;) {
            var c = e,
                p = t,
                v = n,
                N = s,
                _ = p.flags;
            switch (p.tag) {
                case 0:
                case 11:
                case 15:
                    as(c, p, v, N, o), $s(8, p);
                    break;
                case 23:
                    break;
                case 22:
                    var k = p.stateNode;
                    p.memoizedState !== null ? k._visibility & 2 ? as(c, p, v, N, o) : Ws(c, p) : (k._visibility |= 2, as(c, p, v, N, o)), o && _ & 2048 && tu(p.alternate, p);
                    break;
                case 24:
                    as(c, p, v, N, o), o && _ & 2048 && nu(p.alternate, p);
                    break;
                default:
                    as(c, p, v, N, o)
            }
            t = t.sibling
        }
    }

    function Ws(e, t) {
        if (t.subtreeFlags & 10256)
            for (t = t.child; t !== null;) {
                var n = e,
                    s = t,
                    o = s.flags;
                switch (s.tag) {
                    case 22:
                        Ws(n, s), o & 2048 && tu(s.alternate, s);
                        break;
                    case 24:
                        Ws(n, s), o & 2048 && nu(s.alternate, s);
                        break;
                    default:
                        Ws(n, s)
                }
                t = t.sibling
            }
    }
    var el = 8192;

    function is(e, t, n) {
        if (e.subtreeFlags & el)
            for (e = e.child; e !== null;) _h(e, t, n), e = e.sibling
    }

    function _h(e, t, n) {
        switch (e.tag) {
            case 26:
                is(e, t, n), e.flags & el && e.memoizedState !== null && A1(n, Yn, e.memoizedState, e.memoizedProps);
                break;
            case 5:
                is(e, t, n);
                break;
            case 3:
            case 4:
                var s = Yn;
                Yn = Br(e.stateNode.containerInfo), is(e, t, n), Yn = s;
                break;
            case 22:
                e.memoizedState === null && (s = e.alternate, s !== null && s.memoizedState !== null ? (s = el, el = 16777216, is(e, t, n), el = s) : is(e, t, n));
                break;
            default:
                is(e, t, n)
        }
    }

    function Lh(e) {
        var t = e.alternate;
        if (t !== null && (e = t.child, e !== null)) {
            t.child = null;
            do t = e.sibling, e.sibling = null, e = t; while (e !== null)
        }
    }

    function tl(e) {
        var t = e.deletions;
        if ((e.flags & 16) !== 0) {
            if (t !== null)
                for (var n = 0; n < t.length; n++) {
                    var s = t[n];
                    Kt = s, Bh(s, e)
                }
            Lh(e)
        }
        if (e.subtreeFlags & 10256)
            for (e = e.child; e !== null;) Vh(e), e = e.sibling
    }

    function Vh(e) {
        switch (e.tag) {
            case 0:
            case 11:
            case 15:
                tl(e), e.flags & 2048 && Ha(9, e, e.return);
                break;
            case 3:
                tl(e);
                break;
            case 12:
                tl(e);
                break;
            case 22:
                var t = e.stateNode;
                e.memoizedState !== null && t._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (t._visibility &= -3, jr(e)) : tl(e);
                break;
            default:
                tl(e)
        }
    }

    function jr(e) {
        var t = e.deletions;
        if ((e.flags & 16) !== 0) {
            if (t !== null)
                for (var n = 0; n < t.length; n++) {
                    var s = t[n];
                    Kt = s, Bh(s, e)
                }
            Lh(e)
        }
        for (e = e.child; e !== null;) {
            switch (t = e, t.tag) {
                case 0:
                case 11:
                case 15:
                    Ha(8, t, t.return), jr(t);
                    break;
                case 22:
                    n = t.stateNode, n._visibility & 2 && (n._visibility &= -3, jr(t));
                    break;
                default:
                    jr(t)
            }
            e = e.sibling
        }
    }

    function Bh(e, t) {
        for (; Kt !== null;) {
            var n = Kt;
            switch (n.tag) {
                case 0:
                case 11:
                case 15:
                    Ha(8, n, t);
                    break;
                case 23:
                case 22:
                    if (n.memoizedState !== null && n.memoizedState.cachePool !== null) {
                        var s = n.memoizedState.cachePool.pool;
                        s != null && s.refCount++
                    }
                    break;
                case 24:
                    Us(n.memoizedState.cache)
            }
            if (s = n.child, s !== null) s.return = n, Kt = s;
            else e: for (n = e; Kt !== null;) {
                s = Kt;
                var o = s.sibling,
                    c = s.return;
                if (Ah(s), s === n) {
                    Kt = null;
                    break e
                }
                if (o !== null) {
                    o.return = c, Kt = o;
                    break e
                }
                Kt = c
            }
        }
    }
    var qv = {
            getCacheForType: function(e) {
                var t = Jt(Et),
                    n = t.data.get(e);
                return n === void 0 && (n = e(), t.data.set(e, n)), n
            },
            cacheSignal: function() {
                return Jt(Et).controller.signal
            }
        },
        kv = typeof WeakMap == "function" ? WeakMap : Map,
        Pe = 0,
        it = null,
        He = null,
        qe = 0,
        $e = 0,
        vn = null,
        Ga = !1,
        ss = !1,
        au = !1,
        va = 0,
        vt = 0,
        Ya = 0,
        Ci = 0,
        iu = 0,
        bn = 0,
        ls = 0,
        nl = null,
        mn = null,
        su = !1,
        Mr = 0,
        Uh = 0,
        wr = 1 / 0,
        Ar = null,
        qa = null,
        Ht = 0,
        ka = null,
        rs = null,
        ba = 0,
        lu = 0,
        ru = null,
        Hh = null,
        al = 0,
        ou = null;

    function Sn() {
        return (Pe & 2) !== 0 && qe !== 0 ? qe & -qe : O.T !== null ? hu() : Bl()
    }

    function Gh() {
        if (bn === 0)
            if ((qe & 536870912) === 0 || Xe) {
                var e = R;
                R <<= 1, (R & 3932160) === 0 && (R = 262144), bn = e
            } else bn = 536870912;
        return e = yn.current, e !== null && (e.flags |= 32), bn
    }

    function hn(e, t, n) {
        (e === it && ($e === 2 || $e === 9) || e.cancelPendingCommit !== null) && (os(e, 0), Xa(e, qe, bn, !1)), Zn(e, n), ((Pe & 2) === 0 || e !== it) && (e === it && ((Pe & 2) === 0 && (Ci |= n), vt === 4 && Xa(e, qe, bn, !1)), In(e))
    }

    function Yh(e, t, n) {
        if ((Pe & 6) !== 0) throw Error(r(327));
        var s = !n && (t & 127) === 0 && (t & e.expiredLanes) === 0 || wt(e, t),
            o = s ? Zv(e, t) : uu(e, t, !0),
            c = s;
        do {
            if (o === 0) {
                ss && !s && Xa(e, t, 0, !1);
                break
            } else {
                if (n = e.current.alternate, c && !Xv(n)) {
                    o = uu(e, t, !1), c = !1;
                    continue
                }
                if (o === 2) {
                    if (c = t, e.errorRecoveryDisabledLanes & c) var p = 0;
                    else p = e.pendingLanes & -536870913, p = p !== 0 ? p : p & 536870912 ? 536870912 : 0;
                    if (p !== 0) {
                        t = p;
                        e: {
                            var v = e;o = nl;
                            var N = v.current.memoizedState.isDehydrated;
                            if (N && (os(v, p).flags |= 256), p = uu(v, p, !1), p !== 2) {
                                if (au && !N) {
                                    v.errorRecoveryDisabledLanes |= c, Ci |= c, o = 4;
                                    break e
                                }
                                c = mn, mn = o, c !== null && (mn === null ? mn = c : mn.push.apply(mn, c))
                            }
                            o = p
                        }
                        if (c = !1, o !== 2) continue
                    }
                }
                if (o === 1) {
                    os(e, 0), Xa(e, t, 0, !0);
                    break
                }
                e: {
                    switch (s = e, c = o, c) {
                        case 0:
                        case 1:
                            throw Error(r(345));
                        case 4:
                            if ((t & 4194048) !== t) break;
                        case 6:
                            Xa(s, t, bn, !Ga);
                            break e;
                        case 2:
                            mn = null;
                            break;
                        case 3:
                        case 5:
                            break;
                        default:
                            throw Error(r(329))
                    }
                    if ((t & 62914560) === t && (o = Mr + 300 - pt(), 10 < o)) {
                        if (Xa(s, t, bn, !Ga), Je(s, 0, !0) !== 0) break e;
                        ba = t, s.timeoutHandle = xp(qh.bind(null, s, n, mn, Ar, su, t, bn, Ci, ls, Ga, c, "Throttled", -0, 0), o);
                        break e
                    }
                    qh(s, n, mn, Ar, su, t, bn, Ci, ls, Ga, c, null, -0, 0)
                }
            }
            break
        } while (!0);
        In(e)
    }

    function qh(e, t, n, s, o, c, p, v, N, _, k, Q, L, B) {
        if (e.timeoutHandle = -1, Q = t.subtreeFlags, Q & 8192 || (Q & 16785408) === 16785408) {
            Q = {
                stylesheets: null,
                count: 0,
                imgCount: 0,
                imgBytes: 0,
                suspenseyImages: [],
                waitingForImages: !0,
                waitingForViewTransition: !1,
                unsuspend: sa
            }, _h(t, c, Q);
            var ue = (c & 62914560) === c ? Mr - pt() : (c & 4194048) === c ? Uh - pt() : 0;
            if (ue = E1(Q, ue), ue !== null) {
                ba = c, e.cancelPendingCommit = ue(Jh.bind(null, e, t, c, n, s, o, p, v, N, k, Q, null, L, B)), Xa(e, c, p, !_);
                return
            }
        }
        Jh(e, t, c, n, s, o, p, v, N)
    }

    function Xv(e) {
        for (var t = e;;) {
            var n = t.tag;
            if ((n === 0 || n === 11 || n === 15) && t.flags & 16384 && (n = t.updateQueue, n !== null && (n = n.stores, n !== null)))
                for (var s = 0; s < n.length; s++) {
                    var o = n[s],
                        c = o.getSnapshot;
                    o = o.value;
                    try {
                        if (!pn(c(), o)) return !1
                    } catch {
                        return !1
                    }
                }
            if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
            else {
                if (t === e) break;
                for (; t.sibling === null;) {
                    if (t.return === null || t.return === e) return !0;
                    t = t.return
                }
                t.sibling.return = t.return, t = t.sibling
            }
        }
        return !0
    }

    function Xa(e, t, n, s) {
        t &= ~iu, t &= ~Ci, e.suspendedLanes |= t, e.pingedLanes &= ~t, s && (e.warmLanes |= t), s = e.expirationTimes;
        for (var o = t; 0 < o;) {
            var c = 31 - Lt(o),
                p = 1 << c;
            s[c] = -1, o &= ~p
        }
        n !== 0 && ja(e, n, t)
    }

    function Er() {
        return (Pe & 6) === 0 ? (il(0), !1) : !0
    }

    function cu() {
        if (He !== null) {
            if ($e === 0) var e = He.return;
            else e = He, ca = bi = null, Mc(e), Ii = null, Gs = 0, e = He;
            for (; e !== null;) vh(e.alternate, e), e = e.return;
            He = null
        }
    }

    function os(e, t) {
        var n = e.timeoutHandle;
        n !== -1 && (e.timeoutHandle = -1, u1(n)), n = e.cancelPendingCommit, n !== null && (e.cancelPendingCommit = null, n()), ba = 0, cu(), it = e, He = n = ra(e.current, null), qe = t, $e = 0, vn = null, Ga = !1, ss = wt(e, t), au = !1, ls = bn = iu = Ci = Ya = vt = 0, mn = nl = null, su = !1, (t & 8) !== 0 && (t |= t & 32);
        var s = e.entangledLanes;
        if (s !== 0)
            for (e = e.entanglements, s &= t; 0 < s;) {
                var o = 31 - Lt(s),
                    c = 1 << o;
                t |= e[o], s &= ~c
            }
        return va = t, Fl(), n
    }

    function kh(e, t) {
        _e = null, O.H = Ps, t === $i || t === ar ? (t = sm(), $e = 3) : t === mc ? (t = sm(), $e = 4) : $e = t === Yc ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, vn = t, He === null && (vt = 1, yr(e, En(t, e.current)))
    }

    function Xh() {
        var e = yn.current;
        return e === null ? !0 : (qe & 4194048) === qe ? On === null : (qe & 62914560) === qe || (qe & 536870912) !== 0 ? e === On : !1
    }

    function Kh() {
        var e = O.H;
        return O.H = Ps, e === null ? Ps : e
    }

    function Zh() {
        var e = O.A;
        return O.A = qv, e
    }

    function Cr() {
        vt = 4, Ga || (qe & 4194048) !== qe && yn.current !== null || (ss = !0), (Ya & 134217727) === 0 && (Ci & 134217727) === 0 || it === null || Xa(it, qe, bn, !1)
    }

    function uu(e, t, n) {
        var s = Pe;
        Pe |= 2;
        var o = Kh(),
            c = Zh();
        (it !== e || qe !== t) && (Ar = null, os(e, t)), t = !1;
        var p = vt;
        e: do try {
                if ($e !== 0 && He !== null) {
                    var v = He,
                        N = vn;
                    switch ($e) {
                        case 8:
                            cu(), p = 6;
                            break e;
                        case 3:
                        case 2:
                        case 9:
                        case 6:
                            yn.current === null && (t = !0);
                            var _ = $e;
                            if ($e = 0, vn = null, cs(e, v, N, _), n && ss) {
                                p = 0;
                                break e
                            }
                            break;
                        default:
                            _ = $e, $e = 0, vn = null, cs(e, v, N, _)
                    }
                }
                Kv(), p = vt;
                break
            } catch (k) {
                kh(e, k)
            }
            while (!0);
            return t && e.shellSuspendCounter++, ca = bi = null, Pe = s, O.H = o, O.A = c, He === null && (it = null, qe = 0, Fl()), p
    }

    function Kv() {
        for (; He !== null;) Qh(He)
    }

    function Zv(e, t) {
        var n = Pe;
        Pe |= 2;
        var s = Kh(),
            o = Zh();
        it !== e || qe !== t ? (Ar = null, wr = pt() + 500, os(e, t)) : ss = wt(e, t);
        e: do try {
                if ($e !== 0 && He !== null) {
                    t = He;
                    var c = vn;
                    t: switch ($e) {
                        case 1:
                            $e = 0, vn = null, cs(e, t, c, 1);
                            break;
                        case 2:
                        case 9:
                            if (am(c)) {
                                $e = 0, vn = null, Ph(t);
                                break
                            }
                            t = function() {
                                $e !== 2 && $e !== 9 || it !== e || ($e = 7), In(e)
                            }, c.then(t, t);
                            break e;
                        case 3:
                            $e = 7;
                            break e;
                        case 4:
                            $e = 5;
                            break e;
                        case 7:
                            am(c) ? ($e = 0, vn = null, Ph(t)) : ($e = 0, vn = null, cs(e, t, c, 7));
                            break;
                        case 5:
                            var p = null;
                            switch (He.tag) {
                                case 26:
                                    p = He.memoizedState;
                                case 5:
                                case 27:
                                    var v = He;
                                    if (p ? zp(p) : v.stateNode.complete) {
                                        $e = 0, vn = null;
                                        var N = v.sibling;
                                        if (N !== null) He = N;
                                        else {
                                            var _ = v.return;
                                            _ !== null ? (He = _, Dr(_)) : He = null
                                        }
                                        break t
                                    }
                            }
                            $e = 0, vn = null, cs(e, t, c, 5);
                            break;
                        case 6:
                            $e = 0, vn = null, cs(e, t, c, 6);
                            break;
                        case 8:
                            cu(), vt = 6;
                            break e;
                        default:
                            throw Error(r(462))
                    }
                }
                Qv();
                break
            } catch (k) {
                kh(e, k)
            }
            while (!0);
            return ca = bi = null, O.H = s, O.A = o, Pe = n, He !== null ? 0 : (it = null, qe = 0, Fl(), vt)
    }

    function Qv() {
        for (; He !== null && !on();) Qh(He)
    }

    function Qh(e) {
        var t = yh(e.alternate, e, va);
        e.memoizedProps = e.pendingProps, t === null ? Dr(e) : He = t
    }

    function Ph(e) {
        var t = e,
            n = t.alternate;
        switch (t.tag) {
            case 15:
            case 0:
                t = fh(n, t, t.pendingProps, t.type, void 0, qe);
                break;
            case 11:
                t = fh(n, t, t.pendingProps, t.type.render, t.ref, qe);
                break;
            case 5:
                Mc(t);
            default:
                vh(n, t), t = He = Zd(t, va), t = yh(n, t, va)
        }
        e.memoizedProps = e.pendingProps, t === null ? Dr(e) : He = t
    }

    function cs(e, t, n, s) {
        ca = bi = null, Mc(t), Ii = null, Gs = 0;
        var o = t.return;
        try {
            if (Lv(e, o, t, n, qe)) {
                vt = 1, yr(e, En(n, e.current)), He = null;
                return
            }
        } catch (c) {
            if (o !== null) throw He = o, c;
            vt = 1, yr(e, En(n, e.current)), He = null;
            return
        }
        t.flags & 32768 ? (Xe || s === 1 ? e = !0 : ss || (qe & 536870912) !== 0 ? e = !1 : (Ga = e = !0, (s === 2 || s === 9 || s === 3 || s === 6) && (s = yn.current, s !== null && s.tag === 13 && (s.flags |= 16384))), Fh(t, e)) : Dr(t)
    }

    function Dr(e) {
        var t = e;
        do {
            if ((t.flags & 32768) !== 0) {
                Fh(t, Ga);
                return
            }
            e = t.return;
            var n = Uv(t.alternate, t, va);
            if (n !== null) {
                He = n;
                return
            }
            if (t = t.sibling, t !== null) {
                He = t;
                return
            }
            He = t = e
        } while (t !== null);
        vt === 0 && (vt = 5)
    }

    function Fh(e, t) {
        do {
            var n = Hv(e.alternate, e);
            if (n !== null) {
                n.flags &= 32767, He = n;
                return
            }
            if (n = e.return, n !== null && (n.flags |= 32768, n.subtreeFlags = 0, n.deletions = null), !t && (e = e.sibling, e !== null)) {
                He = e;
                return
            }
            He = e = n
        } while (e !== null);
        vt = 6, He = null
    }

    function Jh(e, t, n, s, o, c, p, v, N) {
        e.cancelPendingCommit = null;
        do Rr(); while (Ht !== 0);
        if ((Pe & 6) !== 0) throw Error(r(327));
        if (t !== null) {
            if (t === e.current) throw Error(r(177));
            if (c = t.lanes | t.childLanes, c |= Io, qt(e, n, c, p, v, N), e === it && (He = it = null, qe = 0), rs = t, ka = e, ba = n, lu = c, ru = o, Hh = s, (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? (e.callbackNode = null, e.callbackPriority = 0, $v(Ta, function() {
                    return tp(), null
                })) : (e.callbackNode = null, e.callbackPriority = 0), s = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || s) {
                s = O.T, O.T = null, o = E.p, E.p = 2, p = Pe, Pe |= 4;
                try {
                    Gv(e, t, n)
                } finally {
                    Pe = p, E.p = o, O.T = s
                }
            }
            Ht = 1, $h(), Ih(), Wh()
        }
    }

    function $h() {
        if (Ht === 1) {
            Ht = 0;
            var e = ka,
                t = rs,
                n = (t.flags & 13878) !== 0;
            if ((t.subtreeFlags & 13878) !== 0 || n) {
                n = O.T, O.T = null;
                var s = E.p;
                E.p = 2;
                var o = Pe;
                Pe |= 4;
                try {
                    Rh(t, e);
                    var c = Tu,
                        p = Bd(e.containerInfo),
                        v = c.focusedElem,
                        N = c.selectionRange;
                    if (p !== v && v && v.ownerDocument && Vd(v.ownerDocument.documentElement, v)) {
                        if (N !== null && Qo(v)) {
                            var _ = N.start,
                                k = N.end;
                            if (k === void 0 && (k = _), "selectionStart" in v) v.selectionStart = _, v.selectionEnd = Math.min(k, v.value.length);
                            else {
                                var Q = v.ownerDocument || document,
                                    L = Q && Q.defaultView || window;
                                if (L.getSelection) {
                                    var B = L.getSelection(),
                                        ue = v.textContent.length,
                                        je = Math.min(N.start, ue),
                                        at = N.end === void 0 ? je : Math.min(N.end, ue);
                                    !B.extend && je > at && (p = at, at = je, je = p);
                                    var D = Ld(v, je),
                                        w = Ld(v, at);
                                    if (D && w && (B.rangeCount !== 1 || B.anchorNode !== D.node || B.anchorOffset !== D.offset || B.focusNode !== w.node || B.focusOffset !== w.offset)) {
                                        var z = Q.createRange();
                                        z.setStart(D.node, D.offset), B.removeAllRanges(), je > at ? (B.addRange(z), B.extend(w.node, w.offset)) : (z.setEnd(w.node, w.offset), B.addRange(z))
                                    }
                                }
                            }
                        }
                        for (Q = [], B = v; B = B.parentNode;) B.nodeType === 1 && Q.push({
                            element: B,
                            left: B.scrollLeft,
                            top: B.scrollTop
                        });
                        for (typeof v.focus == "function" && v.focus(), v = 0; v < Q.length; v++) {
                            var Z = Q[v];
                            Z.element.scrollLeft = Z.left, Z.element.scrollTop = Z.top
                        }
                    }
                    kr = !!Su, Tu = Su = null
                } finally {
                    Pe = o, E.p = s, O.T = n
                }
            }
            e.current = t, Ht = 2
        }
    }

    function Ih() {
        if (Ht === 2) {
            Ht = 0;
            var e = ka,
                t = rs,
                n = (t.flags & 8772) !== 0;
            if ((t.subtreeFlags & 8772) !== 0 || n) {
                n = O.T, O.T = null;
                var s = E.p;
                E.p = 2;
                var o = Pe;
                Pe |= 4;
                try {
                    wh(e, t.alternate, t)
                } finally {
                    Pe = o, E.p = s, O.T = n
                }
            }
            Ht = 3
        }
    }

    function Wh() {
        if (Ht === 4 || Ht === 3) {
            Ht = 0, li();
            var e = ka,
                t = rs,
                n = ba,
                s = Hh;
            (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? Ht = 5 : (Ht = 0, rs = ka = null, ep(e, e.pendingLanes));
            var o = e.pendingLanes;
            if (o === 0 && (qa = null), ui(n), t = t.stateNode, Mt && typeof Mt.onCommitFiberRoot == "function") try {
                Mt.onCommitFiberRoot(ie, t, void 0, (t.current.flags & 128) === 128)
            } catch {}
            if (s !== null) {
                t = O.T, o = E.p, E.p = 2, O.T = null;
                try {
                    for (var c = e.onRecoverableError, p = 0; p < s.length; p++) {
                        var v = s[p];
                        c(v.value, {
                            componentStack: v.stack
                        })
                    }
                } finally {
                    O.T = t, E.p = o
                }
            }(ba & 3) !== 0 && Rr(), In(e), o = e.pendingLanes, (n & 261930) !== 0 && (o & 42) !== 0 ? e === ou ? al++ : (al = 0, ou = e) : al = 0, il(0)
        }
    }

    function ep(e, t) {
        (e.pooledCacheLanes &= t) === 0 && (t = e.pooledCache, t != null && (e.pooledCache = null, Us(t)))
    }

    function Rr() {
        return $h(), Ih(), Wh(), tp()
    }

    function tp() {
        if (Ht !== 5) return !1;
        var e = ka,
            t = lu;
        lu = 0;
        var n = ui(ba),
            s = O.T,
            o = E.p;
        try {
            E.p = 32 > n ? 32 : n, O.T = null, n = ru, ru = null;
            var c = ka,
                p = ba;
            if (Ht = 0, rs = ka = null, ba = 0, (Pe & 6) !== 0) throw Error(r(331));
            var v = Pe;
            if (Pe |= 4, Vh(c.current), zh(c, c.current, p, n), Pe = v, il(0, !1), Mt && typeof Mt.onPostCommitFiberRoot == "function") try {
                Mt.onPostCommitFiberRoot(ie, c)
            } catch {}
            return !0
        } finally {
            E.p = o, O.T = s, ep(e, t)
        }
    }

    function np(e, t, n) {
        t = En(n, t), t = Gc(e.stateNode, t, 2), e = Va(e, t, 2), e !== null && (Zn(e, 2), In(e))
    }

    function Ie(e, t, n) {
        if (e.tag === 3) np(e, e, n);
        else
            for (; t !== null;) {
                if (t.tag === 3) {
                    np(t, e, n);
                    break
                } else if (t.tag === 1) {
                    var s = t.stateNode;
                    if (typeof t.type.getDerivedStateFromError == "function" || typeof s.componentDidCatch == "function" && (qa === null || !qa.has(s))) {
                        e = En(n, e), n = ah(2), s = Va(t, n, 2), s !== null && (ih(n, s, t, e), Zn(s, 2), In(s));
                        break
                    }
                }
                t = t.return
            }
    }

    function fu(e, t, n) {
        var s = e.pingCache;
        if (s === null) {
            s = e.pingCache = new kv;
            var o = new Set;
            s.set(t, o)
        } else o = s.get(t), o === void 0 && (o = new Set, s.set(t, o));
        o.has(n) || (au = !0, o.add(n), e = Pv.bind(null, e, t, n), t.then(e, e))
    }

    function Pv(e, t, n) {
        var s = e.pingCache;
        s !== null && s.delete(t), e.pingedLanes |= e.suspendedLanes & n, e.warmLanes &= ~n, it === e && (qe & n) === n && (vt === 4 || vt === 3 && (qe & 62914560) === qe && 300 > pt() - Mr ? (Pe & 2) === 0 && os(e, 0) : iu |= n, ls === qe && (ls = 0)), In(e)
    }

    function ap(e, t) {
        t === 0 && (t = Mn()), e = yi(e, t), e !== null && (Zn(e, t), In(e))
    }

    function Fv(e) {
        var t = e.memoizedState,
            n = 0;
        t !== null && (n = t.retryLane), ap(e, n)
    }

    function Jv(e, t) {
        var n = 0;
        switch (e.tag) {
            case 31:
            case 13:
                var s = e.stateNode,
                    o = e.memoizedState;
                o !== null && (n = o.retryLane);
                break;
            case 19:
                s = e.stateNode;
                break;
            case 22:
                s = e.stateNode._retryCache;
                break;
            default:
                throw Error(r(314))
        }
        s !== null && s.delete(t), ap(e, n)
    }

    function $v(e, t) {
        return Yt(e, t)
    }
    var Or = null,
        us = null,
        du = !1,
        zr = !1,
        mu = !1,
        Ka = 0;

    function In(e) {
        e !== us && e.next === null && (us === null ? Or = us = e : us = us.next = e), zr = !0, du || (du = !0, Wv())
    }

    function il(e, t) {
        if (!mu && zr) {
            mu = !0;
            do
                for (var n = !1, s = Or; s !== null;) {
                    if (e !== 0) {
                        var o = s.pendingLanes;
                        if (o === 0) var c = 0;
                        else {
                            var p = s.suspendedLanes,
                                v = s.pingedLanes;
                            c = (1 << 31 - Lt(42 | e) + 1) - 1, c &= o & ~(p & ~v), c = c & 201326741 ? c & 201326741 | 1 : c ? c | 2 : 0
                        }
                        c !== 0 && (n = !0, rp(s, c))
                    } else c = qe, c = Je(s, s === it ? c : 0, s.cancelPendingCommit !== null || s.timeoutHandle !== -1), (c & 3) === 0 || wt(s, c) || (n = !0, rp(s, c));
                    s = s.next
                }
            while (n);
            mu = !1
        }
    }

    function Iv() {
        ip()
    }

    function ip() {
        zr = du = !1;
        var e = 0;
        Ka !== 0 && c1() && (e = Ka);
        for (var t = pt(), n = null, s = Or; s !== null;) {
            var o = s.next,
                c = sp(s, t);
            c === 0 ? (s.next = null, n === null ? Or = o : n.next = o, o === null && (us = n)) : (n = s, (e !== 0 || (c & 3) !== 0) && (zr = !0)), s = o
        }
        Ht !== 0 && Ht !== 5 || il(e), Ka !== 0 && (Ka = 0)
    }

    function sp(e, t) {
        for (var n = e.suspendedLanes, s = e.pingedLanes, o = e.expirationTimes, c = e.pendingLanes & -62914561; 0 < c;) {
            var p = 31 - Lt(c),
                v = 1 << p,
                N = o[p];
            N === -1 ? ((v & n) === 0 || (v & s) !== 0) && (o[p] = Hn(v, t)) : N <= t && (e.expiredLanes |= v), c &= ~v
        }
        if (t = it, n = qe, n = Je(e, e === t ? n : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), s = e.callbackNode, n === 0 || e === t && ($e === 2 || $e === 9) || e.cancelPendingCommit !== null) return s !== null && s !== null && Ye(s), e.callbackNode = null, e.callbackPriority = 0;
        if ((n & 3) === 0 || wt(e, n)) {
            if (t = n & -n, t === e.callbackPriority) return t;
            switch (s !== null && Ye(s), ui(n)) {
                case 2:
                case 8:
                    n = Vi;
                    break;
                case 32:
                    n = Ta;
                    break;
                case 268435456:
                    n = Bn;
                    break;
                default:
                    n = Ta
            }
            return s = lp.bind(null, e), n = Yt(n, s), e.callbackPriority = t, e.callbackNode = n, t
        }
        return s !== null && s !== null && Ye(s), e.callbackPriority = 2, e.callbackNode = null, 2
    }

    function lp(e, t) {
        if (Ht !== 0 && Ht !== 5) return e.callbackNode = null, e.callbackPriority = 0, null;
        var n = e.callbackNode;
        if (Rr() && e.callbackNode !== n) return null;
        var s = qe;
        return s = Je(e, e === it ? s : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), s === 0 ? null : (Yh(e, s, t), sp(e, pt()), e.callbackNode != null && e.callbackNode === n ? lp.bind(null, e) : null)
    }

    function rp(e, t) {
        if (Rr()) return null;
        Yh(e, t, !0)
    }

    function Wv() {
        f1(function() {
            (Pe & 6) !== 0 ? Yt(oi, Iv) : ip()
        })
    }

    function hu() {
        if (Ka === 0) {
            var e = Fi;
            e === 0 && (e = St, St <<= 1, (St & 261888) === 0 && (St = 256)), Ka = e
        }
        return Ka
    }

    function op(e) {
        return e == null || typeof e == "symbol" || typeof e == "boolean" ? null : typeof e == "function" ? e : Yl("" + e)
    }

    function cp(e, t) {
        var n = t.ownerDocument.createElement("input");
        return n.name = t.name, n.value = t.value, e.id && n.setAttribute("form", e.id), t.parentNode.insertBefore(n, t), e = new FormData(e), n.parentNode.removeChild(n), e
    }

    function e1(e, t, n, s, o) {
        if (t === "submit" && n && n.stateNode === o) {
            var c = op((o[tn] || null).action),
                p = s.submitter;
            p && (t = (t = p[tn] || null) ? op(t.formAction) : p.getAttribute("formAction"), t !== null && (c = t, p = null));
            var v = new Kl("action", "action", null, s, o);
            e.push({
                event: v,
                listeners: [{
                    instance: null,
                    listener: function() {
                        if (s.defaultPrevented) {
                            if (Ka !== 0) {
                                var N = p ? cp(o, p) : new FormData(o);
                                _c(n, {
                                    pending: !0,
                                    data: N,
                                    method: o.method,
                                    action: c
                                }, null, N)
                            }
                        } else typeof c == "function" && (v.preventDefault(), N = p ? cp(o, p) : new FormData(o), _c(n, {
                            pending: !0,
                            data: N,
                            method: o.method,
                            action: c
                        }, c, N))
                    },
                    currentTarget: o
                }]
            })
        }
    }
    for (var pu = 0; pu < $o.length; pu++) {
        var gu = $o[pu],
            t1 = gu.toLowerCase(),
            n1 = gu[0].toUpperCase() + gu.slice(1);
        Gn(t1, "on" + n1)
    }
    Gn(Gd, "onAnimationEnd"), Gn(Yd, "onAnimationIteration"), Gn(qd, "onAnimationStart"), Gn("dblclick", "onDoubleClick"), Gn("focusin", "onFocus"), Gn("focusout", "onBlur"), Gn(xv, "onTransitionRun"), Gn(vv, "onTransitionStart"), Gn(bv, "onTransitionCancel"), Gn(kd, "onTransitionEnd"), Re("onMouseEnter", ["mouseout", "mouseover"]), Re("onMouseLeave", ["mouseout", "mouseover"]), Re("onPointerEnter", ["pointerout", "pointerover"]), Re("onPointerLeave", ["pointerout", "pointerover"]), V("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), V("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), V("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), V("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), V("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), V("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
    var sl = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),
        a1 = new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(sl));

    function up(e, t) {
        t = (t & 4) !== 0;
        for (var n = 0; n < e.length; n++) {
            var s = e[n],
                o = s.event;
            s = s.listeners;
            e: {
                var c = void 0;
                if (t)
                    for (var p = s.length - 1; 0 <= p; p--) {
                        var v = s[p],
                            N = v.instance,
                            _ = v.currentTarget;
                        if (v = v.listener, N !== c && o.isPropagationStopped()) break e;
                        c = v, o.currentTarget = _;
                        try {
                            c(o)
                        } catch (k) {
                            Pl(k)
                        }
                        o.currentTarget = null, c = N
                    } else
                        for (p = 0; p < s.length; p++) {
                            if (v = s[p], N = v.instance, _ = v.currentTarget, v = v.listener, N !== c && o.isPropagationStopped()) break e;
                            c = v, o.currentTarget = _;
                            try {
                                c(o)
                            } catch (k) {
                                Pl(k)
                            }
                            o.currentTarget = null, c = N
                        }
            }
        }
    }

    function Ge(e, t) {
        var n = t[ws];
        n === void 0 && (n = t[ws] = new Set);
        var s = e + "__bubble";
        n.has(s) || (fp(t, e, 2, !1), n.add(s))
    }

    function yu(e, t, n) {
        var s = 0;
        t && (s |= 4), fp(n, e, s, t)
    }
    var _r = "_reactListening" + Math.random().toString(36).slice(2);

    function xu(e) {
        if (!e[_r]) {
            e[_r] = !0, le.forEach(function(n) {
                n !== "selectionchange" && (a1.has(n) || yu(n, !1, e), yu(n, !0, e))
            });
            var t = e.nodeType === 9 ? e : e.ownerDocument;
            t === null || t[_r] || (t[_r] = !0, yu("selectionchange", !1, t))
        }
    }

    function fp(e, t, n, s) {
        switch (Gp(t)) {
            case 2:
                var o = R1;
                break;
            case 8:
                o = O1;
                break;
            default:
                o = zu
        }
        n = o.bind(null, t, n, e), o = void 0, !Uo || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (o = !0), s ? o !== void 0 ? e.addEventListener(t, n, {
            capture: !0,
            passive: o
        }) : e.addEventListener(t, n, !0) : o !== void 0 ? e.addEventListener(t, n, {
            passive: o
        }) : e.addEventListener(t, n, !1)
    }

    function vu(e, t, n, s, o) {
        var c = s;
        if ((t & 1) === 0 && (t & 2) === 0 && s !== null) e: for (;;) {
            if (s === null) return;
            var p = s.tag;
            if (p === 3 || p === 4) {
                var v = s.stateNode.containerInfo;
                if (v === o) break;
                if (p === 4)
                    for (p = s.return; p !== null;) {
                        var N = p.tag;
                        if ((N === 3 || N === 4) && p.stateNode.containerInfo === o) return;
                        p = p.return
                    }
                for (; v !== null;) {
                    if (p = F(v), p === null) return;
                    if (N = p.tag, N === 5 || N === 6 || N === 26 || N === 27) {
                        s = c = p;
                        continue e
                    }
                    v = v.parentNode
                }
            }
            s = s.return
        }
        gd(function() {
            var _ = c,
                k = Vo(n),
                Q = [];
            e: {
                var L = Xd.get(e);
                if (L !== void 0) {
                    var B = Kl,
                        ue = e;
                    switch (e) {
                        case "keypress":
                            if (kl(n) === 0) break e;
                        case "keydown":
                        case "keyup":
                            B = Jx;
                            break;
                        case "focusin":
                            ue = "focus", B = qo;
                            break;
                        case "focusout":
                            ue = "blur", B = qo;
                            break;
                        case "beforeblur":
                        case "afterblur":
                            B = qo;
                            break;
                        case "click":
                            if (n.button === 2) break e;
                        case "auxclick":
                        case "dblclick":
                        case "mousedown":
                        case "mousemove":
                        case "mouseup":
                        case "mouseout":
                        case "mouseover":
                        case "contextmenu":
                            B = vd;
                            break;
                        case "drag":
                        case "dragend":
                        case "dragenter":
                        case "dragexit":
                        case "dragleave":
                        case "dragover":
                        case "dragstart":
                        case "drop":
                            B = Ux;
                            break;
                        case "touchcancel":
                        case "touchend":
                        case "touchmove":
                        case "touchstart":
                            B = Wx;
                            break;
                        case Gd:
                        case Yd:
                        case qd:
                            B = Yx;
                            break;
                        case kd:
                            B = tv;
                            break;
                        case "scroll":
                        case "scrollend":
                            B = Vx;
                            break;
                        case "wheel":
                            B = av;
                            break;
                        case "copy":
                        case "cut":
                        case "paste":
                            B = kx;
                            break;
                        case "gotpointercapture":
                        case "lostpointercapture":
                        case "pointercancel":
                        case "pointerdown":
                        case "pointermove":
                        case "pointerout":
                        case "pointerover":
                        case "pointerup":
                            B = Sd;
                            break;
                        case "toggle":
                        case "beforetoggle":
                            B = sv
                    }
                    var je = (t & 4) !== 0,
                        at = !je && (e === "scroll" || e === "scrollend"),
                        D = je ? L !== null ? L + "Capture" : null : L;
                    je = [];
                    for (var w = _, z; w !== null;) {
                        var Z = w;
                        if (z = Z.stateNode, Z = Z.tag, Z !== 5 && Z !== 26 && Z !== 27 || z === null || D === null || (Z = As(w, D), Z != null && je.push(ll(w, Z, z))), at) break;
                        w = w.return
                    }
                    0 < je.length && (L = new B(L, ue, null, n, k), Q.push({
                        event: L,
                        listeners: je
                    }))
                }
            }
            if ((t & 7) === 0) {
                e: {
                    if (L = e === "mouseover" || e === "pointerover", B = e === "mouseout" || e === "pointerout", L && n !== Lo && (ue = n.relatedTarget || n.fromElement) && (F(ue) || ue[Ma])) break e;
                    if ((B || L) && (L = k.window === k ? k : (L = k.ownerDocument) ? L.defaultView || L.parentWindow : window, B ? (ue = n.relatedTarget || n.toElement, B = _, ue = ue ? F(ue) : null, ue !== null && (at = d(ue), je = ue.tag, ue !== at || je !== 5 && je !== 27 && je !== 6) && (ue = null)) : (B = null, ue = _), B !== ue)) {
                        if (je = vd, Z = "onMouseLeave", D = "onMouseEnter", w = "mouse", (e === "pointerout" || e === "pointerover") && (je = Sd, Z = "onPointerLeave", D = "onPointerEnter", w = "pointer"), at = B == null ? L : J(B), z = ue == null ? L : J(ue), L = new je(Z, w + "leave", B, n, k), L.target = at, L.relatedTarget = z, Z = null, F(k) === _ && (je = new je(D, w + "enter", ue, n, k), je.target = z, je.relatedTarget = at, Z = je), at = Z, B && ue) t: {
                            for (je = i1, D = B, w = ue, z = 0, Z = D; Z; Z = je(Z)) z++;Z = 0;
                            for (var ve = w; ve; ve = je(ve)) Z++;
                            for (; 0 < z - Z;) D = je(D),
                            z--;
                            for (; 0 < Z - z;) w = je(w),
                            Z--;
                            for (; z--;) {
                                if (D === w || w !== null && D === w.alternate) {
                                    je = D;
                                    break t
                                }
                                D = je(D), w = je(w)
                            }
                            je = null
                        }
                        else je = null;
                        B !== null && dp(Q, L, B, je, !1), ue !== null && at !== null && dp(Q, at, ue, je, !0)
                    }
                }
                e: {
                    if (L = _ ? J(_) : window, B = L.nodeName && L.nodeName.toLowerCase(), B === "select" || B === "input" && L.type === "file") var Ze = Cd;
                    else if (Ad(L))
                        if (Dd) Ze = pv;
                        else {
                            Ze = mv;
                            var me = dv
                        }
                    else B = L.nodeName,
                    !B || B.toLowerCase() !== "input" || L.type !== "checkbox" && L.type !== "radio" ? _ && _o(_.elementType) && (Ze = Cd) : Ze = hv;
                    if (Ze && (Ze = Ze(e, _))) {
                        Ed(Q, Ze, n, k);
                        break e
                    }
                    me && me(e, L, _),
                    e === "focusout" && _ && L.type === "number" && _.memoizedProps.value != null && ot(L, "number", L.value)
                }
                switch (me = _ ? J(_) : window, e) {
                    case "focusin":
                        (Ad(me) || me.contentEditable === "true") && (Yi = me, Po = _, Ls = null);
                        break;
                    case "focusout":
                        Ls = Po = Yi = null;
                        break;
                    case "mousedown":
                        Fo = !0;
                        break;
                    case "contextmenu":
                    case "mouseup":
                    case "dragend":
                        Fo = !1, Ud(Q, n, k);
                        break;
                    case "selectionchange":
                        if (yv) break;
                    case "keydown":
                    case "keyup":
                        Ud(Q, n, k)
                }
                var Ue;
                if (Xo) e: {
                    switch (e) {
                        case "compositionstart":
                            var ke = "onCompositionStart";
                            break e;
                        case "compositionend":
                            ke = "onCompositionEnd";
                            break e;
                        case "compositionupdate":
                            ke = "onCompositionUpdate";
                            break e
                    }
                    ke = void 0
                }
                else Gi ? Md(e, n) && (ke = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (ke = "onCompositionStart");ke && (Td && n.locale !== "ko" && (Gi || ke !== "onCompositionStart" ? ke === "onCompositionEnd" && Gi && (Ue = yd()) : (Ca = k, Ho = "value" in Ca ? Ca.value : Ca.textContent, Gi = !0)), me = Lr(_, ke), 0 < me.length && (ke = new bd(ke, e, null, n, k), Q.push({
                    event: ke,
                    listeners: me
                }), Ue ? ke.data = Ue : (Ue = wd(n), Ue !== null && (ke.data = Ue)))),
                (Ue = rv ? ov(e, n) : cv(e, n)) && (ke = Lr(_, "onBeforeInput"), 0 < ke.length && (me = new bd("onBeforeInput", "beforeinput", null, n, k), Q.push({
                    event: me,
                    listeners: ke
                }), me.data = Ue)),
                e1(Q, e, _, n, k)
            }
            up(Q, t)
        })
    }

    function ll(e, t, n) {
        return {
            instance: e,
            listener: t,
            currentTarget: n
        }
    }

    function Lr(e, t) {
        for (var n = t + "Capture", s = []; e !== null;) {
            var o = e,
                c = o.stateNode;
            if (o = o.tag, o !== 5 && o !== 26 && o !== 27 || c === null || (o = As(e, n), o != null && s.unshift(ll(e, o, c)), o = As(e, t), o != null && s.push(ll(e, o, c))), e.tag === 3) return s;
            e = e.return
        }
        return []
    }

    function i1(e) {
        if (e === null) return null;
        do e = e.return; while (e && e.tag !== 5 && e.tag !== 27);
        return e || null
    }

    function dp(e, t, n, s, o) {
        for (var c = t._reactName, p = []; n !== null && n !== s;) {
            var v = n,
                N = v.alternate,
                _ = v.stateNode;
            if (v = v.tag, N !== null && N === s) break;
            v !== 5 && v !== 26 && v !== 27 || _ === null || (N = _, o ? (_ = As(n, c), _ != null && p.unshift(ll(n, _, N))) : o || (_ = As(n, c), _ != null && p.push(ll(n, _, N)))), n = n.return
        }
        p.length !== 0 && e.push({
            event: t,
            listeners: p
        })
    }
    var s1 = /\r\n?/g,
        l1 = /\u0000|\uFFFD/g;

    function mp(e) {
        return (typeof e == "string" ? e : "" + e).replace(s1, `
`).replace(l1, "")
    }

    function hp(e, t) {
        return t = mp(t), mp(e) === t
    }

    function nt(e, t, n, s, o, c) {
        switch (n) {
            case "children":
                typeof s == "string" ? t === "body" || t === "textarea" && s === "" || wn(e, s) : (typeof s == "number" || typeof s == "bigint") && t !== "body" && wn(e, "" + s);
                break;
            case "className":
                oe(e, "class", s);
                break;
            case "tabIndex":
                oe(e, "tabindex", s);
                break;
            case "dir":
            case "role":
            case "viewBox":
            case "width":
            case "height":
                oe(e, n, s);
                break;
            case "style":
                hd(e, s, c);
                break;
            case "data":
                if (t !== "object") {
                    oe(e, "data", s);
                    break
                }
            case "src":
            case "href":
                if (s === "" && (t !== "a" || n !== "href")) {
                    e.removeAttribute(n);
                    break
                }
                if (s == null || typeof s == "function" || typeof s == "symbol" || typeof s == "boolean") {
                    e.removeAttribute(n);
                    break
                }
                s = Yl("" + s), e.setAttribute(n, s);
                break;
            case "action":
            case "formAction":
                if (typeof s == "function") {
                    e.setAttribute(n, "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");
                    break
                } else typeof c == "function" && (n === "formAction" ? (t !== "input" && nt(e, t, "name", o.name, o, null), nt(e, t, "formEncType", o.formEncType, o, null), nt(e, t, "formMethod", o.formMethod, o, null), nt(e, t, "formTarget", o.formTarget, o, null)) : (nt(e, t, "encType", o.encType, o, null), nt(e, t, "method", o.method, o, null), nt(e, t, "target", o.target, o, null)));
                if (s == null || typeof s == "symbol" || typeof s == "boolean") {
                    e.removeAttribute(n);
                    break
                }
                s = Yl("" + s), e.setAttribute(n, s);
                break;
            case "onClick":
                s != null && (e.onclick = sa);
                break;
            case "onScroll":
                s != null && Ge("scroll", e);
                break;
            case "onScrollEnd":
                s != null && Ge("scrollend", e);
                break;
            case "dangerouslySetInnerHTML":
                if (s != null) {
                    if (typeof s != "object" || !("__html" in s)) throw Error(r(61));
                    if (n = s.__html, n != null) {
                        if (o.children != null) throw Error(r(60));
                        e.innerHTML = n
                    }
                }
                break;
            case "multiple":
                e.multiple = s && typeof s != "function" && typeof s != "symbol";
                break;
            case "muted":
                e.muted = s && typeof s != "function" && typeof s != "symbol";
                break;
            case "suppressContentEditableWarning":
            case "suppressHydrationWarning":
            case "defaultValue":
            case "defaultChecked":
            case "innerHTML":
            case "ref":
                break;
            case "autoFocus":
                break;
            case "xlinkHref":
                if (s == null || typeof s == "function" || typeof s == "boolean" || typeof s == "symbol") {
                    e.removeAttribute("xlink:href");
                    break
                }
                n = Yl("" + s), e.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", n);
                break;
            case "contentEditable":
            case "spellCheck":
            case "draggable":
            case "value":
            case "autoReverse":
            case "externalResourcesRequired":
            case "focusable":
            case "preserveAlpha":
                s != null && typeof s != "function" && typeof s != "symbol" ? e.setAttribute(n, "" + s) : e.removeAttribute(n);
                break;
            case "inert":
            case "allowFullScreen":
            case "async":
            case "autoPlay":
            case "controls":
            case "default":
            case "defer":
            case "disabled":
            case "disablePictureInPicture":
            case "disableRemotePlayback":
            case "formNoValidate":
            case "hidden":
            case "loop":
            case "noModule":
            case "noValidate":
            case "open":
            case "playsInline":
            case "readOnly":
            case "required":
            case "reversed":
            case "scoped":
            case "seamless":
            case "itemScope":
                s && typeof s != "function" && typeof s != "symbol" ? e.setAttribute(n, "") : e.removeAttribute(n);
                break;
            case "capture":
            case "download":
                s === !0 ? e.setAttribute(n, "") : s !== !1 && s != null && typeof s != "function" && typeof s != "symbol" ? e.setAttribute(n, s) : e.removeAttribute(n);
                break;
            case "cols":
            case "rows":
            case "size":
            case "span":
                s != null && typeof s != "function" && typeof s != "symbol" && !isNaN(s) && 1 <= s ? e.setAttribute(n, s) : e.removeAttribute(n);
                break;
            case "rowSpan":
            case "start":
                s == null || typeof s == "function" || typeof s == "symbol" || isNaN(s) ? e.removeAttribute(n) : e.setAttribute(n, s);
                break;
            case "popover":
                Ge("beforetoggle", e), Ge("toggle", e), gt(e, "popover", s);
                break;
            case "xlinkActuate":
                et(e, "http://www.w3.org/1999/xlink", "xlink:actuate", s);
                break;
            case "xlinkArcrole":
                et(e, "http://www.w3.org/1999/xlink", "xlink:arcrole", s);
                break;
            case "xlinkRole":
                et(e, "http://www.w3.org/1999/xlink", "xlink:role", s);
                break;
            case "xlinkShow":
                et(e, "http://www.w3.org/1999/xlink", "xlink:show", s);
                break;
            case "xlinkTitle":
                et(e, "http://www.w3.org/1999/xlink", "xlink:title", s);
                break;
            case "xlinkType":
                et(e, "http://www.w3.org/1999/xlink", "xlink:type", s);
                break;
            case "xmlBase":
                et(e, "http://www.w3.org/XML/1998/namespace", "xml:base", s);
                break;
            case "xmlLang":
                et(e, "http://www.w3.org/XML/1998/namespace", "xml:lang", s);
                break;
            case "xmlSpace":
                et(e, "http://www.w3.org/XML/1998/namespace", "xml:space", s);
                break;
            case "is":
                gt(e, "is", s);
                break;
            case "innerText":
            case "textContent":
                break;
            default:
                (!(2 < n.length) || n[0] !== "o" && n[0] !== "O" || n[1] !== "n" && n[1] !== "N") && (n = _x.get(n) || n, gt(e, n, s))
        }
    }

    function bu(e, t, n, s, o, c) {
        switch (n) {
            case "style":
                hd(e, s, c);
                break;
            case "dangerouslySetInnerHTML":
                if (s != null) {
                    if (typeof s != "object" || !("__html" in s)) throw Error(r(61));
                    if (n = s.__html, n != null) {
                        if (o.children != null) throw Error(r(60));
                        e.innerHTML = n
                    }
                }
                break;
            case "children":
                typeof s == "string" ? wn(e, s) : (typeof s == "number" || typeof s == "bigint") && wn(e, "" + s);
                break;
            case "onScroll":
                s != null && Ge("scroll", e);
                break;
            case "onScrollEnd":
                s != null && Ge("scrollend", e);
                break;
            case "onClick":
                s != null && (e.onclick = sa);
                break;
            case "suppressContentEditableWarning":
            case "suppressHydrationWarning":
            case "innerHTML":
            case "ref":
                break;
            case "innerText":
            case "textContent":
                break;
            default:
                if (!be.hasOwnProperty(n)) e: {
                    if (n[0] === "o" && n[1] === "n" && (o = n.endsWith("Capture"), t = n.slice(2, o ? n.length - 7 : void 0), c = e[tn] || null, c = c != null ? c[n] : null, typeof c == "function" && e.removeEventListener(t, c, o), typeof s == "function")) {
                        typeof c != "function" && c !== null && (n in e ? e[n] = null : e.hasAttribute(n) && e.removeAttribute(n)), e.addEventListener(t, s, o);
                        break e
                    }
                    n in e ? e[n] = s : s === !0 ? e.setAttribute(n, "") : gt(e, n, s)
                }
        }
    }

    function It(e, t, n) {
        switch (t) {
            case "div":
            case "span":
            case "svg":
            case "path":
            case "a":
            case "g":
            case "p":
            case "li":
                break;
            case "img":
                Ge("error", e), Ge("load", e);
                var s = !1,
                    o = !1,
                    c;
                for (c in n)
                    if (n.hasOwnProperty(c)) {
                        var p = n[c];
                        if (p != null) switch (c) {
                            case "src":
                                s = !0;
                                break;
                            case "srcSet":
                                o = !0;
                                break;
                            case "children":
                            case "dangerouslySetInnerHTML":
                                throw Error(r(137, t));
                            default:
                                nt(e, t, c, p, n, null)
                        }
                    } o && nt(e, t, "srcSet", n.srcSet, n, null), s && nt(e, t, "src", n.src, n, null);
                return;
            case "input":
                Ge("invalid", e);
                var v = c = p = o = null,
                    N = null,
                    _ = null;
                for (s in n)
                    if (n.hasOwnProperty(s)) {
                        var k = n[s];
                        if (k != null) switch (s) {
                            case "name":
                                o = k;
                                break;
                            case "type":
                                p = k;
                                break;
                            case "checked":
                                N = k;
                                break;
                            case "defaultChecked":
                                _ = k;
                                break;
                            case "value":
                                c = k;
                                break;
                            case "defaultValue":
                                v = k;
                                break;
                            case "children":
                            case "dangerouslySetInnerHTML":
                                if (k != null) throw Error(r(137, t));
                                break;
                            default:
                                nt(e, t, s, k, n, null)
                        }
                    } Aa(e, c, v, N, _, p, o, !1);
                return;
            case "select":
                Ge("invalid", e), s = p = c = null;
                for (o in n)
                    if (n.hasOwnProperty(o) && (v = n[o], v != null)) switch (o) {
                        case "value":
                            c = v;
                            break;
                        case "defaultValue":
                            p = v;
                            break;
                        case "multiple":
                            s = v;
                        default:
                            nt(e, t, o, v, n, null)
                    }
                t = c, n = p, e.multiple = !!s, t != null ? mt(e, !!s, t, !1) : n != null && mt(e, !!s, n, !0);
                return;
            case "textarea":
                Ge("invalid", e), c = o = s = null;
                for (p in n)
                    if (n.hasOwnProperty(p) && (v = n[p], v != null)) switch (p) {
                        case "value":
                            s = v;
                            break;
                        case "defaultValue":
                            o = v;
                            break;
                        case "children":
                            c = v;
                            break;
                        case "dangerouslySetInnerHTML":
                            if (v != null) throw Error(r(91));
                            break;
                        default:
                            nt(e, t, p, v, n, null)
                    }
                At(e, s, o, c);
                return;
            case "option":
                for (N in n)
                    if (n.hasOwnProperty(N) && (s = n[N], s != null)) switch (N) {
                        case "selected":
                            e.selected = s && typeof s != "function" && typeof s != "symbol";
                            break;
                        default:
                            nt(e, t, N, s, n, null)
                    }
                return;
            case "dialog":
                Ge("beforetoggle", e), Ge("toggle", e), Ge("cancel", e), Ge("close", e);
                break;
            case "iframe":
            case "object":
                Ge("load", e);
                break;
            case "video":
            case "audio":
                for (s = 0; s < sl.length; s++) Ge(sl[s], e);
                break;
            case "image":
                Ge("error", e), Ge("load", e);
                break;
            case "details":
                Ge("toggle", e);
                break;
            case "embed":
            case "source":
            case "link":
                Ge("error", e), Ge("load", e);
            case "area":
            case "base":
            case "br":
            case "col":
            case "hr":
            case "keygen":
            case "meta":
            case "param":
            case "track":
            case "wbr":
            case "menuitem":
                for (_ in n)
                    if (n.hasOwnProperty(_) && (s = n[_], s != null)) switch (_) {
                        case "children":
                        case "dangerouslySetInnerHTML":
                            throw Error(r(137, t));
                        default:
                            nt(e, t, _, s, n, null)
                    }
                return;
            default:
                if (_o(t)) {
                    for (k in n) n.hasOwnProperty(k) && (s = n[k], s !== void 0 && bu(e, t, k, s, n, void 0));
                    return
                }
        }
        for (v in n) n.hasOwnProperty(v) && (s = n[v], s != null && nt(e, t, v, s, n, null))
    }

    function r1(e, t, n, s) {
        switch (t) {
            case "div":
            case "span":
            case "svg":
            case "path":
            case "a":
            case "g":
            case "p":
            case "li":
                break;
            case "input":
                var o = null,
                    c = null,
                    p = null,
                    v = null,
                    N = null,
                    _ = null,
                    k = null;
                for (B in n) {
                    var Q = n[B];
                    if (n.hasOwnProperty(B) && Q != null) switch (B) {
                        case "checked":
                            break;
                        case "value":
                            break;
                        case "defaultValue":
                            N = Q;
                        default:
                            s.hasOwnProperty(B) || nt(e, t, B, null, s, Q)
                    }
                }
                for (var L in s) {
                    var B = s[L];
                    if (Q = n[L], s.hasOwnProperty(L) && (B != null || Q != null)) switch (L) {
                        case "type":
                            c = B;
                            break;
                        case "name":
                            o = B;
                            break;
                        case "checked":
                            _ = B;
                            break;
                        case "defaultChecked":
                            k = B;
                            break;
                        case "value":
                            p = B;
                            break;
                        case "defaultValue":
                            v = B;
                            break;
                        case "children":
                        case "dangerouslySetInnerHTML":
                            if (B != null) throw Error(r(137, t));
                            break;
                        default:
                            B !== Q && nt(e, t, L, B, s, Q)
                    }
                }
                mi(e, p, v, N, _, k, c, o);
                return;
            case "select":
                B = p = v = L = null;
                for (c in n)
                    if (N = n[c], n.hasOwnProperty(c) && N != null) switch (c) {
                        case "value":
                            break;
                        case "multiple":
                            B = N;
                        default:
                            s.hasOwnProperty(c) || nt(e, t, c, null, s, N)
                    }
                for (o in s)
                    if (c = s[o], N = n[o], s.hasOwnProperty(o) && (c != null || N != null)) switch (o) {
                        case "value":
                            L = c;
                            break;
                        case "defaultValue":
                            v = c;
                            break;
                        case "multiple":
                            p = c;
                        default:
                            c !== N && nt(e, t, o, c, s, N)
                    }
                t = v, n = p, s = B, L != null ? mt(e, !!n, L, !1) : !!s != !!n && (t != null ? mt(e, !!n, t, !0) : mt(e, !!n, n ? [] : "", !1));
                return;
            case "textarea":
                B = L = null;
                for (v in n)
                    if (o = n[v], n.hasOwnProperty(v) && o != null && !s.hasOwnProperty(v)) switch (v) {
                        case "value":
                            break;
                        case "children":
                            break;
                        default:
                            nt(e, t, v, null, s, o)
                    }
                for (p in s)
                    if (o = s[p], c = n[p], s.hasOwnProperty(p) && (o != null || c != null)) switch (p) {
                        case "value":
                            L = o;
                            break;
                        case "defaultValue":
                            B = o;
                            break;
                        case "children":
                            break;
                        case "dangerouslySetInnerHTML":
                            if (o != null) throw Error(r(91));
                            break;
                        default:
                            o !== c && nt(e, t, p, o, s, c)
                    }
                Ea(e, L, B);
                return;
            case "option":
                for (var ue in n)
                    if (L = n[ue], n.hasOwnProperty(ue) && L != null && !s.hasOwnProperty(ue)) switch (ue) {
                        case "selected":
                            e.selected = !1;
                            break;
                        default:
                            nt(e, t, ue, null, s, L)
                    }
                for (N in s)
                    if (L = s[N], B = n[N], s.hasOwnProperty(N) && L !== B && (L != null || B != null)) switch (N) {
                        case "selected":
                            e.selected = L && typeof L != "function" && typeof L != "symbol";
                            break;
                        default:
                            nt(e, t, N, L, s, B)
                    }
                return;
            case "img":
            case "link":
            case "area":
            case "base":
            case "br":
            case "col":
            case "embed":
            case "hr":
            case "keygen":
            case "meta":
            case "param":
            case "source":
            case "track":
            case "wbr":
            case "menuitem":
                for (var je in n) L = n[je], n.hasOwnProperty(je) && L != null && !s.hasOwnProperty(je) && nt(e, t, je, null, s, L);
                for (_ in s)
                    if (L = s[_], B = n[_], s.hasOwnProperty(_) && L !== B && (L != null || B != null)) switch (_) {
                        case "children":
                        case "dangerouslySetInnerHTML":
                            if (L != null) throw Error(r(137, t));
                            break;
                        default:
                            nt(e, t, _, L, s, B)
                    }
                return;
            default:
                if (_o(t)) {
                    for (var at in n) L = n[at], n.hasOwnProperty(at) && L !== void 0 && !s.hasOwnProperty(at) && bu(e, t, at, void 0, s, L);
                    for (k in s) L = s[k], B = n[k], !s.hasOwnProperty(k) || L === B || L === void 0 && B === void 0 || bu(e, t, k, L, s, B);
                    return
                }
        }
        for (var D in n) L = n[D], n.hasOwnProperty(D) && L != null && !s.hasOwnProperty(D) && nt(e, t, D, null, s, L);
        for (Q in s) L = s[Q], B = n[Q], !s.hasOwnProperty(Q) || L === B || L == null && B == null || nt(e, t, Q, L, s, B)
    }

    function pp(e) {
        switch (e) {
            case "css":
            case "script":
            case "font":
            case "img":
            case "image":
            case "input":
            case "link":
                return !0;
            default:
                return !1
        }
    }

    function o1() {
        if (typeof performance.getEntriesByType == "function") {
            for (var e = 0, t = 0, n = performance.getEntriesByType("resource"), s = 0; s < n.length; s++) {
                var o = n[s],
                    c = o.transferSize,
                    p = o.initiatorType,
                    v = o.duration;
                if (c && v && pp(p)) {
                    for (p = 0, v = o.responseEnd, s += 1; s < n.length; s++) {
                        var N = n[s],
                            _ = N.startTime;
                        if (_ > v) break;
                        var k = N.transferSize,
                            Q = N.initiatorType;
                        k && pp(Q) && (N = N.responseEnd, p += k * (N < v ? 1 : (v - _) / (N - _)))
                    }
                    if (--s, t += 8 * (c + p) / (o.duration / 1e3), e++, 10 < e) break
                }
            }
            if (0 < e) return t / e / 1e6
        }
        return navigator.connection && (e = navigator.connection.downlink, typeof e == "number") ? e : 5
    }
    var Su = null,
        Tu = null;

    function Vr(e) {
        return e.nodeType === 9 ? e : e.ownerDocument
    }

    function gp(e) {
        switch (e) {
            case "http://www.w3.org/2000/svg":
                return 1;
            case "http://www.w3.org/1998/Math/MathML":
                return 2;
            default:
                return 0
        }
    }

    function yp(e, t) {
        if (e === 0) switch (t) {
            case "svg":
                return 1;
            case "math":
                return 2;
            default:
                return 0
        }
        return e === 1 && t === "foreignObject" ? 0 : e
    }

    function Nu(e, t) {
        return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null
    }
    var ju = null;

    function c1() {
        var e = window.event;
        return e && e.type === "popstate" ? e === ju ? !1 : (ju = e, !0) : (ju = null, !1)
    }
    var xp = typeof setTimeout == "function" ? setTimeout : void 0,
        u1 = typeof clearTimeout == "function" ? clearTimeout : void 0,
        vp = typeof Promise == "function" ? Promise : void 0,
        f1 = typeof queueMicrotask == "function" ? queueMicrotask : typeof vp < "u" ? function(e) {
            return vp.resolve(null).then(e).catch(d1)
        } : xp;

    function d1(e) {
        setTimeout(function() {
            throw e
        })
    }

    function Za(e) {
        return e === "head"
    }

    function bp(e, t) {
        var n = t,
            s = 0;
        do {
            var o = n.nextSibling;
            if (e.removeChild(n), o && o.nodeType === 8)
                if (n = o.data, n === "/$" || n === "/&") {
                    if (s === 0) {
                        e.removeChild(o), hs(t);
                        return
                    }
                    s--
                } else if (n === "$" || n === "$?" || n === "$~" || n === "$!" || n === "&") s++;
            else if (n === "html") rl(e.ownerDocument.documentElement);
            else if (n === "head") {
                n = e.ownerDocument.head, rl(n);
                for (var c = n.firstChild; c;) {
                    var p = c.nextSibling,
                        v = c.nodeName;
                    c[wa] || v === "SCRIPT" || v === "STYLE" || v === "LINK" && c.rel.toLowerCase() === "stylesheet" || n.removeChild(c), c = p
                }
            } else n === "body" && rl(e.ownerDocument.body);
            n = o
        } while (n);
        hs(t)
    }

    function Sp(e, t) {
        var n = e;
        e = 0;
        do {
            var s = n.nextSibling;
            if (n.nodeType === 1 ? t ? (n._stashedDisplay = n.style.display, n.style.display = "none") : (n.style.display = n._stashedDisplay || "", n.getAttribute("style") === "" && n.removeAttribute("style")) : n.nodeType === 3 && (t ? (n._stashedText = n.nodeValue, n.nodeValue = "") : n.nodeValue = n._stashedText || ""), s && s.nodeType === 8)
                if (n = s.data, n === "/$") {
                    if (e === 0) break;
                    e--
                } else n !== "$" && n !== "$?" && n !== "$~" && n !== "$!" || e++;
            n = s
        } while (n)
    }

    function Mu(e) {
        var t = e.firstChild;
        for (t && t.nodeType === 10 && (t = t.nextSibling); t;) {
            var n = t;
            switch (t = t.nextSibling, n.nodeName) {
                case "HTML":
                case "HEAD":
                case "BODY":
                    Mu(n), C(n);
                    continue;
                case "SCRIPT":
                case "STYLE":
                    continue;
                case "LINK":
                    if (n.rel.toLowerCase() === "stylesheet") continue
            }
            e.removeChild(n)
        }
    }

    function m1(e, t, n, s) {
        for (; e.nodeType === 1;) {
            var o = n;
            if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
                if (!s && (e.nodeName !== "INPUT" || e.type !== "hidden")) break
            } else if (s) {
                if (!e[wa]) switch (t) {
                    case "meta":
                        if (!e.hasAttribute("itemprop")) break;
                        return e;
                    case "link":
                        if (c = e.getAttribute("rel"), c === "stylesheet" && e.hasAttribute("data-precedence")) break;
                        if (c !== o.rel || e.getAttribute("href") !== (o.href == null || o.href === "" ? null : o.href) || e.getAttribute("crossorigin") !== (o.crossOrigin == null ? null : o.crossOrigin) || e.getAttribute("title") !== (o.title == null ? null : o.title)) break;
                        return e;
                    case "style":
                        if (e.hasAttribute("data-precedence")) break;
                        return e;
                    case "script":
                        if (c = e.getAttribute("src"), (c !== (o.src == null ? null : o.src) || e.getAttribute("type") !== (o.type == null ? null : o.type) || e.getAttribute("crossorigin") !== (o.crossOrigin == null ? null : o.crossOrigin)) && c && e.hasAttribute("async") && !e.hasAttribute("itemprop")) break;
                        return e;
                    default:
                        return e
                }
            } else if (t === "input" && e.type === "hidden") {
                var c = o.name == null ? null : "" + o.name;
                if (o.type === "hidden" && e.getAttribute("name") === c) return e
            } else return e;
            if (e = zn(e.nextSibling), e === null) break
        }
        return null
    }

    function h1(e, t, n) {
        if (t === "") return null;
        for (; e.nodeType !== 3;)
            if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !n || (e = zn(e.nextSibling), e === null)) return null;
        return e
    }

    function Tp(e, t) {
        for (; e.nodeType !== 8;)
            if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !t || (e = zn(e.nextSibling), e === null)) return null;
        return e
    }

    function wu(e) {
        return e.data === "$?" || e.data === "$~"
    }

    function Au(e) {
        return e.data === "$!" || e.data === "$?" && e.ownerDocument.readyState !== "loading"
    }

    function p1(e, t) {
        var n = e.ownerDocument;
        if (e.data === "$~") e._reactRetry = t;
        else if (e.data !== "$?" || n.readyState !== "loading") t();
        else {
            var s = function() {
                t(), n.removeEventListener("DOMContentLoaded", s)
            };
            n.addEventListener("DOMContentLoaded", s), e._reactRetry = s
        }
    }

    function zn(e) {
        for (; e != null; e = e.nextSibling) {
            var t = e.nodeType;
            if (t === 1 || t === 3) break;
            if (t === 8) {
                if (t = e.data, t === "$" || t === "$!" || t === "$?" || t === "$~" || t === "&" || t === "F!" || t === "F") break;
                if (t === "/$" || t === "/&") return null
            }
        }
        return e
    }
    var Eu = null;

    function Np(e) {
        e = e.nextSibling;
        for (var t = 0; e;) {
            if (e.nodeType === 8) {
                var n = e.data;
                if (n === "/$" || n === "/&") {
                    if (t === 0) return zn(e.nextSibling);
                    t--
                } else n !== "$" && n !== "$!" && n !== "$?" && n !== "$~" && n !== "&" || t++
            }
            e = e.nextSibling
        }
        return null
    }

    function jp(e) {
        e = e.previousSibling;
        for (var t = 0; e;) {
            if (e.nodeType === 8) {
                var n = e.data;
                if (n === "$" || n === "$!" || n === "$?" || n === "$~" || n === "&") {
                    if (t === 0) return e;
                    t--
                } else n !== "/$" && n !== "/&" || t++
            }
            e = e.previousSibling
        }
        return null
    }

    function Mp(e, t, n) {
        switch (t = Vr(n), e) {
            case "html":
                if (e = t.documentElement, !e) throw Error(r(452));
                return e;
            case "head":
                if (e = t.head, !e) throw Error(r(453));
                return e;
            case "body":
                if (e = t.body, !e) throw Error(r(454));
                return e;
            default:
                throw Error(r(451))
        }
    }

    function rl(e) {
        for (var t = e.attributes; t.length;) e.removeAttributeNode(t[0]);
        C(e)
    }
    var _n = new Map,
        wp = new Set;

    function Br(e) {
        return typeof e.getRootNode == "function" ? e.getRootNode() : e.nodeType === 9 ? e : e.ownerDocument
    }
    var Sa = E.d;
    E.d = {
        f: g1,
        r: y1,
        D: x1,
        C: v1,
        L: b1,
        m: S1,
        X: N1,
        S: T1,
        M: j1
    };

    function g1() {
        var e = Sa.f(),
            t = Er();
        return e || t
    }

    function y1(e) {
        var t = ee(e);
        t !== null && t.tag === 5 && t.type === "form" ? km(t) : Sa.r(e)
    }
    var fs = typeof document > "u" ? null : document;

    function Ap(e, t, n) {
        var s = fs;
        if (s && typeof t == "string" && t) {
            var o = Pt(t);
            o = 'link[rel="' + e + '"][href="' + o + '"]', typeof n == "string" && (o += '[crossorigin="' + n + '"]'), wp.has(o) || (wp.add(o), e = {
                rel: e,
                crossOrigin: n,
                href: t
            }, s.querySelector(o) === null && (t = s.createElement("link"), It(t, "link", e), q(t), s.head.appendChild(t)))
        }
    }

    function x1(e) {
        Sa.D(e), Ap("dns-prefetch", e, null)
    }

    function v1(e, t) {
        Sa.C(e, t), Ap("preconnect", e, t)
    }

    function b1(e, t, n) {
        Sa.L(e, t, n);
        var s = fs;
        if (s && e && t) {
            var o = 'link[rel="preload"][as="' + Pt(t) + '"]';
            t === "image" && n && n.imageSrcSet ? (o += '[imagesrcset="' + Pt(n.imageSrcSet) + '"]', typeof n.imageSizes == "string" && (o += '[imagesizes="' + Pt(n.imageSizes) + '"]')) : o += '[href="' + Pt(e) + '"]';
            var c = o;
            switch (t) {
                case "style":
                    c = ds(e);
                    break;
                case "script":
                    c = ms(e)
            }
            _n.has(c) || (e = b({
                rel: "preload",
                href: t === "image" && n && n.imageSrcSet ? void 0 : e,
                as: t
            }, n), _n.set(c, e), s.querySelector(o) !== null || t === "style" && s.querySelector(ol(c)) || t === "script" && s.querySelector(cl(c)) || (t = s.createElement("link"), It(t, "link", e), q(t), s.head.appendChild(t)))
        }
    }

    function S1(e, t) {
        Sa.m(e, t);
        var n = fs;
        if (n && e) {
            var s = t && typeof t.as == "string" ? t.as : "script",
                o = 'link[rel="modulepreload"][as="' + Pt(s) + '"][href="' + Pt(e) + '"]',
                c = o;
            switch (s) {
                case "audioworklet":
                case "paintworklet":
                case "serviceworker":
                case "sharedworker":
                case "worker":
                case "script":
                    c = ms(e)
            }
            if (!_n.has(c) && (e = b({
                    rel: "modulepreload",
                    href: e
                }, t), _n.set(c, e), n.querySelector(o) === null)) {
                switch (s) {
                    case "audioworklet":
                    case "paintworklet":
                    case "serviceworker":
                    case "sharedworker":
                    case "worker":
                    case "script":
                        if (n.querySelector(cl(c))) return
                }
                s = n.createElement("link"), It(s, "link", e), q(s), n.head.appendChild(s)
            }
        }
    }

    function T1(e, t, n) {
        Sa.S(e, t, n);
        var s = fs;
        if (s && e) {
            var o = pe(s).hoistableStyles,
                c = ds(e);
            t = t || "default";
            var p = o.get(c);
            if (!p) {
                var v = {
                    loading: 0,
                    preload: null
                };
                if (p = s.querySelector(ol(c))) v.loading = 5;
                else {
                    e = b({
                        rel: "stylesheet",
                        href: e,
                        "data-precedence": t
                    }, n), (n = _n.get(c)) && Cu(e, n);
                    var N = p = s.createElement("link");
                    q(N), It(N, "link", e), N._p = new Promise(function(_, k) {
                        N.onload = _, N.onerror = k
                    }), N.addEventListener("load", function() {
                        v.loading |= 1
                    }), N.addEventListener("error", function() {
                        v.loading |= 2
                    }), v.loading |= 4, Ur(p, t, s)
                }
                p = {
                    type: "stylesheet",
                    instance: p,
                    count: 1,
                    state: v
                }, o.set(c, p)
            }
        }
    }

    function N1(e, t) {
        Sa.X(e, t);
        var n = fs;
        if (n && e) {
            var s = pe(n).hoistableScripts,
                o = ms(e),
                c = s.get(o);
            c || (c = n.querySelector(cl(o)), c || (e = b({
                src: e,
                async: !0
            }, t), (t = _n.get(o)) && Du(e, t), c = n.createElement("script"), q(c), It(c, "link", e), n.head.appendChild(c)), c = {
                type: "script",
                instance: c,
                count: 1,
                state: null
            }, s.set(o, c))
        }
    }

    function j1(e, t) {
        Sa.M(e, t);
        var n = fs;
        if (n && e) {
            var s = pe(n).hoistableScripts,
                o = ms(e),
                c = s.get(o);
            c || (c = n.querySelector(cl(o)), c || (e = b({
                src: e,
                async: !0,
                type: "module"
            }, t), (t = _n.get(o)) && Du(e, t), c = n.createElement("script"), q(c), It(c, "link", e), n.head.appendChild(c)), c = {
                type: "script",
                instance: c,
                count: 1,
                state: null
            }, s.set(o, c))
        }
    }

    function Ep(e, t, n, s) {
        var o = (o = Te.current) ? Br(o) : null;
        if (!o) throw Error(r(446));
        switch (e) {
            case "meta":
            case "title":
                return null;
            case "style":
                return typeof n.precedence == "string" && typeof n.href == "string" ? (t = ds(n.href), n = pe(o).hoistableStyles, s = n.get(t), s || (s = {
                    type: "style",
                    instance: null,
                    count: 0,
                    state: null
                }, n.set(t, s)), s) : {
                    type: "void",
                    instance: null,
                    count: 0,
                    state: null
                };
            case "link":
                if (n.rel === "stylesheet" && typeof n.href == "string" && typeof n.precedence == "string") {
                    e = ds(n.href);
                    var c = pe(o).hoistableStyles,
                        p = c.get(e);
                    if (p || (o = o.ownerDocument || o, p = {
                            type: "stylesheet",
                            instance: null,
                            count: 0,
                            state: {
                                loading: 0,
                                preload: null
                            }
                        }, c.set(e, p), (c = o.querySelector(ol(e))) && !c._p && (p.instance = c, p.state.loading = 5), _n.has(e) || (n = {
                            rel: "preload",
                            as: "style",
                            href: n.href,
                            crossOrigin: n.crossOrigin,
                            integrity: n.integrity,
                            media: n.media,
                            hrefLang: n.hrefLang,
                            referrerPolicy: n.referrerPolicy
                        }, _n.set(e, n), c || M1(o, e, n, p.state))), t && s === null) throw Error(r(528, ""));
                    return p
                }
                if (t && s !== null) throw Error(r(529, ""));
                return null;
            case "script":
                return t = n.async, n = n.src, typeof n == "string" && t && typeof t != "function" && typeof t != "symbol" ? (t = ms(n), n = pe(o).hoistableScripts, s = n.get(t), s || (s = {
                    type: "script",
                    instance: null,
                    count: 0,
                    state: null
                }, n.set(t, s)), s) : {
                    type: "void",
                    instance: null,
                    count: 0,
                    state: null
                };
            default:
                throw Error(r(444, e))
        }
    }

    function ds(e) {
        return 'href="' + Pt(e) + '"'
    }

    function ol(e) {
        return 'link[rel="stylesheet"][' + e + "]"
    }

    function Cp(e) {
        return b({}, e, {
            "data-precedence": e.precedence,
            precedence: null
        })
    }

    function M1(e, t, n, s) {
        e.querySelector('link[rel="preload"][as="style"][' + t + "]") ? s.loading = 1 : (t = e.createElement("link"), s.preload = t, t.addEventListener("load", function() {
            return s.loading |= 1
        }), t.addEventListener("error", function() {
            return s.loading |= 2
        }), It(t, "link", n), q(t), e.head.appendChild(t))
    }

    function ms(e) {
        return '[src="' + Pt(e) + '"]'
    }

    function cl(e) {
        return "script[async]" + e
    }

    function Dp(e, t, n) {
        if (t.count++, t.instance === null) switch (t.type) {
            case "style":
                var s = e.querySelector('style[data-href~="' + Pt(n.href) + '"]');
                if (s) return t.instance = s, q(s), s;
                var o = b({}, n, {
                    "data-href": n.href,
                    "data-precedence": n.precedence,
                    href: null,
                    precedence: null
                });
                return s = (e.ownerDocument || e).createElement("style"), q(s), It(s, "style", o), Ur(s, n.precedence, e), t.instance = s;
            case "stylesheet":
                o = ds(n.href);
                var c = e.querySelector(ol(o));
                if (c) return t.state.loading |= 4, t.instance = c, q(c), c;
                s = Cp(n), (o = _n.get(o)) && Cu(s, o), c = (e.ownerDocument || e).createElement("link"), q(c);
                var p = c;
                return p._p = new Promise(function(v, N) {
                    p.onload = v, p.onerror = N
                }), It(c, "link", s), t.state.loading |= 4, Ur(c, n.precedence, e), t.instance = c;
            case "script":
                return c = ms(n.src), (o = e.querySelector(cl(c))) ? (t.instance = o, q(o), o) : (s = n, (o = _n.get(c)) && (s = b({}, n), Du(s, o)), e = e.ownerDocument || e, o = e.createElement("script"), q(o), It(o, "link", s), e.head.appendChild(o), t.instance = o);
            case "void":
                return null;
            default:
                throw Error(r(443, t.type))
        } else t.type === "stylesheet" && (t.state.loading & 4) === 0 && (s = t.instance, t.state.loading |= 4, Ur(s, n.precedence, e));
        return t.instance
    }

    function Ur(e, t, n) {
        for (var s = n.querySelectorAll('link[rel="stylesheet"][data-precedence],style[data-precedence]'), o = s.length ? s[s.length - 1] : null, c = o, p = 0; p < s.length; p++) {
            var v = s[p];
            if (v.dataset.precedence === t) c = v;
            else if (c !== o) break
        }
        c ? c.parentNode.insertBefore(e, c.nextSibling) : (t = n.nodeType === 9 ? n.head : n, t.insertBefore(e, t.firstChild))
    }

    function Cu(e, t) {
        e.crossOrigin == null && (e.crossOrigin = t.crossOrigin), e.referrerPolicy == null && (e.referrerPolicy = t.referrerPolicy), e.title == null && (e.title = t.title)
    }

    function Du(e, t) {
        e.crossOrigin == null && (e.crossOrigin = t.crossOrigin), e.referrerPolicy == null && (e.referrerPolicy = t.referrerPolicy), e.integrity == null && (e.integrity = t.integrity)
    }
    var Hr = null;

    function Rp(e, t, n) {
        if (Hr === null) {
            var s = new Map,
                o = Hr = new Map;
            o.set(n, s)
        } else o = Hr, s = o.get(n), s || (s = new Map, o.set(n, s));
        if (s.has(e)) return s;
        for (s.set(e, null), n = n.getElementsByTagName(e), o = 0; o < n.length; o++) {
            var c = n[o];
            if (!(c[wa] || c[Vt] || e === "link" && c.getAttribute("rel") === "stylesheet") && c.namespaceURI !== "http://www.w3.org/2000/svg") {
                var p = c.getAttribute(t) || "";
                p = e + p;
                var v = s.get(p);
                v ? v.push(c) : s.set(p, [c])
            }
        }
        return s
    }

    function Op(e, t, n) {
        e = e.ownerDocument || e, e.head.insertBefore(n, t === "title" ? e.querySelector("head > title") : null)
    }

    function w1(e, t, n) {
        if (n === 1 || t.itemProp != null) return !1;
        switch (e) {
            case "meta":
            case "title":
                return !0;
            case "style":
                if (typeof t.precedence != "string" || typeof t.href != "string" || t.href === "") break;
                return !0;
            case "link":
                if (typeof t.rel != "string" || typeof t.href != "string" || t.href === "" || t.onLoad || t.onError) break;
                switch (t.rel) {
                    case "stylesheet":
                        return e = t.disabled, typeof t.precedence == "string" && e == null;
                    default:
                        return !0
                }
            case "script":
                if (t.async && typeof t.async != "function" && typeof t.async != "symbol" && !t.onLoad && !t.onError && t.src && typeof t.src == "string") return !0
        }
        return !1
    }

    function zp(e) {
        return !(e.type === "stylesheet" && (e.state.loading & 3) === 0)
    }

    function A1(e, t, n, s) {
        if (n.type === "stylesheet" && (typeof s.media != "string" || matchMedia(s.media).matches !== !1) && (n.state.loading & 4) === 0) {
            if (n.instance === null) {
                var o = ds(s.href),
                    c = t.querySelector(ol(o));
                if (c) {
                    t = c._p, t !== null && typeof t == "object" && typeof t.then == "function" && (e.count++, e = Gr.bind(e), t.then(e, e)), n.state.loading |= 4, n.instance = c, q(c);
                    return
                }
                c = t.ownerDocument || t, s = Cp(s), (o = _n.get(o)) && Cu(s, o), c = c.createElement("link"), q(c);
                var p = c;
                p._p = new Promise(function(v, N) {
                    p.onload = v, p.onerror = N
                }), It(c, "link", s), n.instance = c
            }
            e.stylesheets === null && (e.stylesheets = new Map), e.stylesheets.set(n, t), (t = n.state.preload) && (n.state.loading & 3) === 0 && (e.count++, n = Gr.bind(e), t.addEventListener("load", n), t.addEventListener("error", n))
        }
    }
    var Ru = 0;

    function E1(e, t) {
        return e.stylesheets && e.count === 0 && qr(e, e.stylesheets), 0 < e.count || 0 < e.imgCount ? function(n) {
            var s = setTimeout(function() {
                if (e.stylesheets && qr(e, e.stylesheets), e.unsuspend) {
                    var c = e.unsuspend;
                    e.unsuspend = null, c()
                }
            }, 6e4 + t);
            0 < e.imgBytes && Ru === 0 && (Ru = 62500 * o1());
            var o = setTimeout(function() {
                if (e.waitingForImages = !1, e.count === 0 && (e.stylesheets && qr(e, e.stylesheets), e.unsuspend)) {
                    var c = e.unsuspend;
                    e.unsuspend = null, c()
                }
            }, (e.imgBytes > Ru ? 50 : 800) + t);
            return e.unsuspend = n,
                function() {
                    e.unsuspend = null, clearTimeout(s), clearTimeout(o)
                }
        } : null
    }

    function Gr() {
        if (this.count--, this.count === 0 && (this.imgCount === 0 || !this.waitingForImages)) {
            if (this.stylesheets) qr(this, this.stylesheets);
            else if (this.unsuspend) {
                var e = this.unsuspend;
                this.unsuspend = null, e()
            }
        }
    }
    var Yr = null;

    function qr(e, t) {
        e.stylesheets = null, e.unsuspend !== null && (e.count++, Yr = new Map, t.forEach(C1, e), Yr = null, Gr.call(e))
    }

    function C1(e, t) {
        if (!(t.state.loading & 4)) {
            var n = Yr.get(e);
            if (n) var s = n.get(null);
            else {
                n = new Map, Yr.set(e, n);
                for (var o = e.querySelectorAll("link[data-precedence],style[data-precedence]"), c = 0; c < o.length; c++) {
                    var p = o[c];
                    (p.nodeName === "LINK" || p.getAttribute("media") !== "not all") && (n.set(p.dataset.precedence, p), s = p)
                }
                s && n.set(null, s)
            }
            o = t.instance, p = o.getAttribute("data-precedence"), c = n.get(p) || s, c === s && n.set(null, o), n.set(p, o), this.count++, s = Gr.bind(this), o.addEventListener("load", s), o.addEventListener("error", s), c ? c.parentNode.insertBefore(o, c.nextSibling) : (e = e.nodeType === 9 ? e.head : e, e.insertBefore(o, e.firstChild)), t.state.loading |= 4
        }
    }
    var ul = {
        $$typeof: P,
        Provider: null,
        Consumer: null,
        _currentValue: ae,
        _currentValue2: ae,
        _threadCount: 0
    };

    function D1(e, t, n, s, o, c, p, v, N) {
        this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = Na(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Na(0), this.hiddenUpdates = Na(null), this.identifierPrefix = s, this.onUncaughtError = o, this.onCaughtError = c, this.onRecoverableError = p, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = N, this.incompleteTransitions = new Map
    }

    function _p(e, t, n, s, o, c, p, v, N, _, k, Q) {
        return e = new D1(e, t, n, p, N, _, k, Q, v), t = 1, c === !0 && (t |= 24), c = gn(3, null, null, t), e.current = c, c.stateNode = e, t = uc(), t.refCount++, e.pooledCache = t, t.refCount++, c.memoizedState = {
            element: s,
            isDehydrated: n,
            cache: t
        }, hc(c), e
    }

    function Lp(e) {
        return e ? (e = Xi, e) : Xi
    }

    function Vp(e, t, n, s, o, c) {
        o = Lp(o), s.context === null ? s.context = o : s.pendingContext = o, s = La(t), s.payload = {
            element: n
        }, c = c === void 0 ? null : c, c !== null && (s.callback = c), n = Va(e, s, t), n !== null && (hn(n, e, t), qs(n, e, t))
    }

    function Bp(e, t) {
        if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
            var n = e.retryLane;
            e.retryLane = n !== 0 && n < t ? n : t
        }
    }

    function Ou(e, t) {
        Bp(e, t), (e = e.alternate) && Bp(e, t)
    }

    function Up(e) {
        if (e.tag === 13 || e.tag === 31) {
            var t = yi(e, 67108864);
            t !== null && hn(t, e, 67108864), Ou(e, 67108864)
        }
    }

    function Hp(e) {
        if (e.tag === 13 || e.tag === 31) {
            var t = Sn();
            t = Ms(t);
            var n = yi(e, t);
            n !== null && hn(n, e, t), Ou(e, t)
        }
    }
    var kr = !0;

    function R1(e, t, n, s) {
        var o = O.T;
        O.T = null;
        var c = E.p;
        try {
            E.p = 2, zu(e, t, n, s)
        } finally {
            E.p = c, O.T = o
        }
    }

    function O1(e, t, n, s) {
        var o = O.T;
        O.T = null;
        var c = E.p;
        try {
            E.p = 8, zu(e, t, n, s)
        } finally {
            E.p = c, O.T = o
        }
    }

    function zu(e, t, n, s) {
        if (kr) {
            var o = _u(s);
            if (o === null) vu(e, t, s, Xr, n), Yp(e, s);
            else if (_1(o, e, t, n, s)) s.stopPropagation();
            else if (Yp(e, s), t & 4 && -1 < z1.indexOf(e)) {
                for (; o !== null;) {
                    var c = ee(o);
                    if (c !== null) switch (c.tag) {
                        case 3:
                            if (c = c.stateNode, c.current.memoizedState.isDehydrated) {
                                var p = De(c.pendingLanes);
                                if (p !== 0) {
                                    var v = c;
                                    for (v.pendingLanes |= 2, v.entangledLanes |= 2; p;) {
                                        var N = 1 << 31 - Lt(p);
                                        v.entanglements[1] |= N, p &= ~N
                                    }
                                    In(c), (Pe & 6) === 0 && (wr = pt() + 500, il(0))
                                }
                            }
                            break;
                        case 31:
                        case 13:
                            v = yi(c, 2), v !== null && hn(v, c, 2), Er(), Ou(c, 2)
                    }
                    if (c = _u(s), c === null && vu(e, t, s, Xr, n), c === o) break;
                    o = c
                }
                o !== null && s.stopPropagation()
            } else vu(e, t, s, null, n)
        }
    }

    function _u(e) {
        return e = Vo(e), Lu(e)
    }
    var Xr = null;

    function Lu(e) {
        if (Xr = null, e = F(e), e !== null) {
            var t = d(e);
            if (t === null) e = null;
            else {
                var n = t.tag;
                if (n === 13) {
                    if (e = m(t), e !== null) return e;
                    e = null
                } else if (n === 31) {
                    if (e = h(t), e !== null) return e;
                    e = null
                } else if (n === 3) {
                    if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
                    e = null
                } else t !== e && (e = null)
            }
        }
        return Xr = e, null
    }

    function Gp(e) {
        switch (e) {
            case "beforetoggle":
            case "cancel":
            case "click":
            case "close":
            case "contextmenu":
            case "copy":
            case "cut":
            case "auxclick":
            case "dblclick":
            case "dragend":
            case "dragstart":
            case "drop":
            case "focusin":
            case "focusout":
            case "input":
            case "invalid":
            case "keydown":
            case "keypress":
            case "keyup":
            case "mousedown":
            case "mouseup":
            case "paste":
            case "pause":
            case "play":
            case "pointercancel":
            case "pointerdown":
            case "pointerup":
            case "ratechange":
            case "reset":
            case "resize":
            case "seeked":
            case "submit":
            case "toggle":
            case "touchcancel":
            case "touchend":
            case "touchstart":
            case "volumechange":
            case "change":
            case "selectionchange":
            case "textInput":
            case "compositionstart":
            case "compositionend":
            case "compositionupdate":
            case "beforeblur":
            case "afterblur":
            case "beforeinput":
            case "blur":
            case "fullscreenchange":
            case "focus":
            case "hashchange":
            case "popstate":
            case "select":
            case "selectstart":
                return 2;
            case "drag":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "mousemove":
            case "mouseout":
            case "mouseover":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "scroll":
            case "touchmove":
            case "wheel":
            case "mouseenter":
            case "mouseleave":
            case "pointerenter":
            case "pointerleave":
                return 8;
            case "message":
                switch (ri()) {
                    case oi:
                        return 2;
                    case Vi:
                        return 8;
                    case Ta:
                    case aa:
                        return 32;
                    case Bn:
                        return 268435456;
                    default:
                        return 32
                }
            default:
                return 32
        }
    }
    var Vu = !1,
        Qa = null,
        Pa = null,
        Fa = null,
        fl = new Map,
        dl = new Map,
        Ja = [],
        z1 = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");

    function Yp(e, t) {
        switch (e) {
            case "focusin":
            case "focusout":
                Qa = null;
                break;
            case "dragenter":
            case "dragleave":
                Pa = null;
                break;
            case "mouseover":
            case "mouseout":
                Fa = null;
                break;
            case "pointerover":
            case "pointerout":
                fl.delete(t.pointerId);
                break;
            case "gotpointercapture":
            case "lostpointercapture":
                dl.delete(t.pointerId)
        }
    }

    function ml(e, t, n, s, o, c) {
        return e === null || e.nativeEvent !== c ? (e = {
            blockedOn: t,
            domEventName: n,
            eventSystemFlags: s,
            nativeEvent: c,
            targetContainers: [o]
        }, t !== null && (t = ee(t), t !== null && Up(t)), e) : (e.eventSystemFlags |= s, t = e.targetContainers, o !== null && t.indexOf(o) === -1 && t.push(o), e)
    }

    function _1(e, t, n, s, o) {
        switch (t) {
            case "focusin":
                return Qa = ml(Qa, e, t, n, s, o), !0;
            case "dragenter":
                return Pa = ml(Pa, e, t, n, s, o), !0;
            case "mouseover":
                return Fa = ml(Fa, e, t, n, s, o), !0;
            case "pointerover":
                var c = o.pointerId;
                return fl.set(c, ml(fl.get(c) || null, e, t, n, s, o)), !0;
            case "gotpointercapture":
                return c = o.pointerId, dl.set(c, ml(dl.get(c) || null, e, t, n, s, o)), !0
        }
        return !1
    }

    function qp(e) {
        var t = F(e.target);
        if (t !== null) {
            var n = d(t);
            if (n !== null) {
                if (t = n.tag, t === 13) {
                    if (t = m(n), t !== null) {
                        e.blockedOn = t, Ul(e.priority, function() {
                            Hp(n)
                        });
                        return
                    }
                } else if (t === 31) {
                    if (t = h(n), t !== null) {
                        e.blockedOn = t, Ul(e.priority, function() {
                            Hp(n)
                        });
                        return
                    }
                } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
                    e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
                    return
                }
            }
        }
        e.blockedOn = null
    }

    function Kr(e) {
        if (e.blockedOn !== null) return !1;
        for (var t = e.targetContainers; 0 < t.length;) {
            var n = _u(e.nativeEvent);
            if (n === null) {
                n = e.nativeEvent;
                var s = new n.constructor(n.type, n);
                Lo = s, n.target.dispatchEvent(s), Lo = null
            } else return t = ee(n), t !== null && Up(t), e.blockedOn = n, !1;
            t.shift()
        }
        return !0
    }

    function kp(e, t, n) {
        Kr(e) && n.delete(t)
    }

    function L1() {
        Vu = !1, Qa !== null && Kr(Qa) && (Qa = null), Pa !== null && Kr(Pa) && (Pa = null), Fa !== null && Kr(Fa) && (Fa = null), fl.forEach(kp), dl.forEach(kp)
    }

    function Zr(e, t) {
        e.blockedOn === t && (e.blockedOn = null, Vu || (Vu = !0, a.unstable_scheduleCallback(a.unstable_NormalPriority, L1)))
    }
    var Qr = null;

    function Xp(e) {
        Qr !== e && (Qr = e, a.unstable_scheduleCallback(a.unstable_NormalPriority, function() {
            Qr === e && (Qr = null);
            for (var t = 0; t < e.length; t += 3) {
                var n = e[t],
                    s = e[t + 1],
                    o = e[t + 2];
                if (typeof s != "function") {
                    if (Lu(s || n) === null) continue;
                    break
                }
                var c = ee(n);
                c !== null && (e.splice(t, 3), t -= 3, _c(c, {
                    pending: !0,
                    data: o,
                    method: n.method,
                    action: s
                }, s, o))
            }
        }))
    }

    function hs(e) {
        function t(N) {
            return Zr(N, e)
        }
        Qa !== null && Zr(Qa, e), Pa !== null && Zr(Pa, e), Fa !== null && Zr(Fa, e), fl.forEach(t), dl.forEach(t);
        for (var n = 0; n < Ja.length; n++) {
            var s = Ja[n];
            s.blockedOn === e && (s.blockedOn = null)
        }
        for (; 0 < Ja.length && (n = Ja[0], n.blockedOn === null);) qp(n), n.blockedOn === null && Ja.shift();
        if (n = (e.ownerDocument || e).$$reactFormReplay, n != null)
            for (s = 0; s < n.length; s += 3) {
                var o = n[s],
                    c = n[s + 1],
                    p = o[tn] || null;
                if (typeof c == "function") p || Xp(n);
                else if (p) {
                    var v = null;
                    if (c && c.hasAttribute("formAction")) {
                        if (o = c, p = c[tn] || null) v = p.formAction;
                        else if (Lu(o) !== null) continue
                    } else v = p.action;
                    typeof v == "function" ? n[s + 1] = v : (n.splice(s, 3), s -= 3), Xp(n)
                }
            }
    }

    function Kp() {
        function e(c) {
            c.canIntercept && c.info === "react-transition" && c.intercept({
                handler: function() {
                    return new Promise(function(p) {
                        return o = p
                    })
                },
                focusReset: "manual",
                scroll: "manual"
            })
        }

        function t() {
            o !== null && (o(), o = null), s || setTimeout(n, 20)
        }

        function n() {
            if (!s && !navigation.transition) {
                var c = navigation.currentEntry;
                c && c.url != null && navigation.navigate(c.url, {
                    state: c.getState(),
                    info: "react-transition",
                    history: "replace"
                })
            }
        }
        if (typeof navigation == "object") {
            var s = !1,
                o = null;
            return navigation.addEventListener("navigate", e), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(n, 100),
                function() {
                    s = !0, navigation.removeEventListener("navigate", e), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), o !== null && (o(), o = null)
                }
        }
    }

    function Bu(e) {
        this._internalRoot = e
    }
    Pr.prototype.render = Bu.prototype.render = function(e) {
        var t = this._internalRoot;
        if (t === null) throw Error(r(409));
        var n = t.current,
            s = Sn();
        Vp(n, s, e, t, null, null)
    }, Pr.prototype.unmount = Bu.prototype.unmount = function() {
        var e = this._internalRoot;
        if (e !== null) {
            this._internalRoot = null;
            var t = e.containerInfo;
            Vp(e.current, 2, null, e, null, null), Er(), t[Ma] = null
        }
    };

    function Pr(e) {
        this._internalRoot = e
    }
    Pr.prototype.unstable_scheduleHydration = function(e) {
        if (e) {
            var t = Bl();
            e = {
                blockedOn: null,
                target: e,
                priority: t
            };
            for (var n = 0; n < Ja.length && t !== 0 && t < Ja[n].priority; n++);
            Ja.splice(n, 0, e), n === 0 && qp(e)
        }
    };
    var Zp = i.version;
    if (Zp !== "19.2.4") throw Error(r(527, Zp, "19.2.4"));
    E.findDOMNode = function(e) {
        var t = e._reactInternals;
        if (t === void 0) throw typeof e.render == "function" ? Error(r(188)) : (e = Object.keys(e).join(","), Error(r(268, e)));
        return e = y(t), e = e !== null ? g(e) : null, e = e === null ? null : e.stateNode, e
    };
    var V1 = {
        bundleType: 0,
        version: "19.2.4",
        rendererPackageName: "react-dom",
        currentDispatcherRef: O,
        reconcilerVersion: "19.2.4"
    };
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
        var Fr = __REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (!Fr.isDisabled && Fr.supportsFiber) try {
            ie = Fr.inject(V1), Mt = Fr
        } catch {}
    }
    return pl.createRoot = function(e, t) {
        if (!f(e)) throw Error(r(299));
        var n = !1,
            s = "",
            o = Wm,
            c = eh,
            p = th;
        return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (s = t.identifierPrefix), t.onUncaughtError !== void 0 && (o = t.onUncaughtError), t.onCaughtError !== void 0 && (c = t.onCaughtError), t.onRecoverableError !== void 0 && (p = t.onRecoverableError)), t = _p(e, 1, !1, null, null, n, s, null, o, c, p, Kp), e[Ma] = t.current, xu(e), new Bu(t)
    }, pl.hydrateRoot = function(e, t, n) {
        if (!f(e)) throw Error(r(299));
        var s = !1,
            o = "",
            c = Wm,
            p = eh,
            v = th,
            N = null;
        return n != null && (n.unstable_strictMode === !0 && (s = !0), n.identifierPrefix !== void 0 && (o = n.identifierPrefix), n.onUncaughtError !== void 0 && (c = n.onUncaughtError), n.onCaughtError !== void 0 && (p = n.onCaughtError), n.onRecoverableError !== void 0 && (v = n.onRecoverableError), n.formState !== void 0 && (N = n.formState)), t = _p(e, 1, !0, t, n ?? null, s, o, N, c, p, v, Kp), t.context = Lp(null), n = t.current, s = Sn(), s = Ms(s), o = La(s), o.callback = null, Va(n, o, s), n = s, t.current.lanes = n, Zn(t, n), In(t), e[Ma] = t.current, xu(e), new Pr(t)
    }, pl.version = "19.2.4", pl
}
var ng;

function Z1() {
    if (ng) return Gu.exports;
    ng = 1;

    function a() {
        if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function")) try {
            __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(a)
        } catch (i) {
            console.error(i)
        }
    }
    return a(), Gu.exports = K1(), Gu.exports
}
var Q1 = Z1();
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const P1 = a => a.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
    F1 = a => a.replace(/^([A-Z])|[\s-_]+(\w)/g, (i, l, r) => r ? r.toUpperCase() : l.toLowerCase()),
    ag = a => {
        const i = F1(a);
        return i.charAt(0).toUpperCase() + i.slice(1)
    },
    H0 = (...a) => a.filter((i, l, r) => !!i && i.trim() !== "" && r.indexOf(i) === l).join(" ").trim(),
    J1 = a => {
        for (const i in a)
            if (i.startsWith("aria-") || i === "role" || i === "title") return !0
    };
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var $1 = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
};
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const I1 = M.forwardRef(({
    color: a = "currentColor",
    size: i = 24,
    strokeWidth: l = 2,
    absoluteStrokeWidth: r,
    className: f = "",
    children: d,
    iconNode: m,
    ...h
}, x) => M.createElement("svg", {
    ref: x,
    ...$1,
    width: i,
    height: i,
    stroke: a,
    strokeWidth: r ? Number(l) * 24 / Number(i) : l,
    className: H0("lucide", f),
    ...!d && !J1(h) && {
        "aria-hidden": "true"
    },
    ...h
}, [...m.map(([y, g]) => M.createElement(y, g)), ...Array.isArray(d) ? d : [d]]));
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const dt = (a, i) => {
    const l = M.forwardRef(({
        className: r,
        ...f
    }, d) => M.createElement(I1, {
        ref: d,
        iconNode: i,
        className: H0(`lucide-${P1(ag(a))}`, `lucide-${a}`, r),
        ...f
    }));
    return l.displayName = ag(a), l
};
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const W1 = [
        ["path", {
            d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
            key: "169zse"
        }]
    ],
    ig = dt("activity", W1);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const eb = [
        ["path", {
            d: "M10.268 21a2 2 0 0 0 3.464 0",
            key: "vwvbt9"
        }],
        ["path", {
            d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
            key: "11g9vi"
        }]
    ],
    tb = dt("bell", eb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const nb = [
        ["path", {
            d: "M3 3v16a2 2 0 0 0 2 2h16",
            key: "c24i48"
        }],
        ["path", {
            d: "M18 17V9",
            key: "2bz60n"
        }],
        ["path", {
            d: "M13 17V5",
            key: "1frdt8"
        }],
        ["path", {
            d: "M8 17v-3",
            key: "17ska0"
        }]
    ],
    G0 = dt("chart-column", nb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ab = [
        ["path", {
            d: "m6 9 6 6 6-6",
            key: "qrunsl"
        }]
    ],
    Y0 = dt("chevron-down", ab);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ib = [
        ["path", {
            d: "m15 18-6-6 6-6",
            key: "1wnfg3"
        }]
    ],
    sg = dt("chevron-left", ib);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const sb = [
        ["path", {
            d: "m9 18 6-6-6-6",
            key: "mthhwq"
        }]
    ],
    ho = dt("chevron-right", sb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const lb = [
        ["circle", {
            cx: "12",
            cy: "12",
            r: "10",
            key: "1mglay"
        }],
        ["line", {
            x1: "12",
            x2: "12",
            y1: "8",
            y2: "12",
            key: "1pkeuh"
        }],
        ["line", {
            x1: "12",
            x2: "12.01",
            y1: "16",
            y2: "16",
            key: "4dfq90"
        }]
    ],
    lg = dt("circle-alert", lb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const rb = [
        ["circle", {
            cx: "12",
            cy: "12",
            r: "10",
            key: "1mglay"
        }],
        ["path", {
            d: "m9 12 2 2 4-4",
            key: "dzmm74"
        }]
    ],
    rg = dt("circle-check", rb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ob = [
        ["path", {
            d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
            key: "ct8e1f"
        }],
        ["path", {
            d: "M14.084 14.158a3 3 0 0 1-4.242-4.242",
            key: "151rxh"
        }],
        ["path", {
            d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
            key: "13bj9a"
        }],
        ["path", {
            d: "m2 2 20 20",
            key: "1ooewy"
        }]
    ],
    bl = dt("eye-off", ob);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const cb = [
        ["path", {
            d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
            key: "1nclc0"
        }],
        ["circle", {
            cx: "12",
            cy: "12",
            r: "3",
            key: "1v7zrd"
        }]
    ],
    Sl = dt("eye", cb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ub = [
        ["path", {
            d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
            key: "1rqfz7"
        }],
        ["path", {
            d: "M14 2v4a2 2 0 0 0 2 2h4",
            key: "tnqrlb"
        }],
        ["path", {
            d: "M10 9H8",
            key: "b1mrlr"
        }],
        ["path", {
            d: "M16 13H8",
            key: "t4e002"
        }],
        ["path", {
            d: "M16 17H8",
            key: "z1uh3a"
        }]
    ],
    fb = dt("file-text", ub);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const db = [
        ["path", {
            d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",
            key: "mvr1a0"
        }]
    ],
    mb = dt("heart", db);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const hb = [
        ["path", {
            d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",
            key: "5wwlr5"
        }],
        ["path", {
            d: "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
            key: "r6nss1"
        }]
    ],
    pb = dt("house", hb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const gb = [
        ["path", {
            d: "M21 12a9 9 0 1 1-6.219-8.56",
            key: "13zald"
        }]
    ],
    io = dt("loader-circle", gb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const yb = [
        ["rect", {
            width: "18",
            height: "11",
            x: "3",
            y: "11",
            rx: "2",
            ry: "2",
            key: "1w4ew1"
        }],
        ["path", {
            d: "M7 11V7a5 5 0 0 1 10 0v4",
            key: "fwvmzm"
        }]
    ],
    Tl = dt("lock", yb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const xb = [
        ["path", {
            d: "m10 17 5-5-5-5",
            key: "1bsop3"
        }],
        ["path", {
            d: "M15 12H3",
            key: "6jk70r"
        }],
        ["path", {
            d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",
            key: "u53s6r"
        }]
    ],
    og = dt("log-in", xb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const vb = [
        ["path", {
            d: "m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",
            key: "132q7q"
        }],
        ["rect", {
            x: "2",
            y: "4",
            width: "20",
            height: "16",
            rx: "2",
            key: "izxlao"
        }]
    ],
    uf = dt("mail", vb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const bb = [
        ["path", {
            d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
            key: "1r0f0z"
        }],
        ["circle", {
            cx: "12",
            cy: "10",
            r: "3",
            key: "ilqhr7"
        }]
    ],
    cg = dt("map-pin", bb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Sb = [
        ["path", {
            d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",
            key: "9njp5v"
        }]
    ],
    ff = dt("phone", Sb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Tb = [
        ["path", {
            d: "m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z",
            key: "wa1lgi"
        }],
        ["path", {
            d: "m8.5 8.5 7 7",
            key: "rvfmvr"
        }]
    ],
    ug = dt("pill", Tb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Nb = [
        ["path", {
            d: "M5 12h14",
            key: "1ays0h"
        }],
        ["path", {
            d: "M12 5v14",
            key: "s699le"
        }]
    ],
    jb = dt("plus", Nb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Mb = [
        ["path", {
            d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
            key: "oel41y"
        }],
        ["path", {
            d: "m9 12 2 2 4-4",
            key: "dzmm74"
        }]
    ],
    q0 = dt("shield-check", Mb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const wb = [
        ["path", {
            d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",
            key: "975kel"
        }],
        ["circle", {
            cx: "12",
            cy: "7",
            r: "4",
            key: "17ys0d"
        }]
    ],
    Mo = dt("user", wb);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ab = [
        ["path", {
            d: "M12 10v2.2l1.6 1",
            key: "n3r21l"
        }],
        ["path", {
            d: "m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05",
            key: "18k57s"
        }],
        ["path", {
            d: "m7.88 16.36.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05",
            key: "16ny36"
        }],
        ["circle", {
            cx: "12",
            cy: "12",
            r: "6",
            key: "1vlfrh"
        }]
    ],
    df = dt("watch", Ab);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Eb = [
        ["path", {
            d: "M18 6 6 18",
            key: "1bl5f8"
        }],
        ["path", {
            d: "m6 6 12 12",
            key: "d8bk6v"
        }]
    ],
    vs = dt("x", Eb),
    Hf = M.createContext({});

function Gf(a) {
    const i = M.useRef(null);
    return i.current === null && (i.current = a()), i.current
}
const Cb = typeof window < "u",
    k0 = Cb ? M.useLayoutEffect : M.useEffect,
    wo = M.createContext(null);

function Yf(a, i) {
    a.indexOf(i) === -1 && a.push(i)
}

function po(a, i) {
    const l = a.indexOf(i);
    l > -1 && a.splice(l, 1)
}
const na = (a, i, l) => l > i ? i : l < a ? a : l;
let qf = () => {};
const ai = {},
    X0 = a => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(a);

function K0(a) {
    return typeof a == "object" && a !== null
}
const Z0 = a => /^0[^.\s]+$/u.test(a);

function Q0(a) {
    let i;
    return () => (i === void 0 && (i = a()), i)
}
const Vn = a => a,
    Db = (a, i) => l => i(a(l)),
    Ol = (...a) => a.reduce(Db),
    Al = (a, i, l) => {
        const r = i - a;
        return r === 0 ? 1 : (l - a) / r
    };
class kf {
    constructor() {
        this.subscriptions = []
    }
    add(i) {
        return Yf(this.subscriptions, i), () => po(this.subscriptions, i)
    }
    notify(i, l, r) {
        const f = this.subscriptions.length;
        if (f)
            if (f === 1) this.subscriptions[0](i, l, r);
            else
                for (let d = 0; d < f; d++) {
                    const m = this.subscriptions[d];
                    m && m(i, l, r)
                }
    }
    getSize() {
        return this.subscriptions.length
    }
    clear() {
        this.subscriptions.length = 0
    }
}
const Tn = a => a * 1e3,
    Ln = a => a / 1e3;

function P0(a, i) {
    return i ? a * (1e3 / i) : 0
}
const F0 = (a, i, l) => (((1 - 3 * l + 3 * i) * a + (3 * l - 6 * i)) * a + 3 * i) * a,
    Rb = 1e-7,
    Ob = 12;

function zb(a, i, l, r, f) {
    let d, m, h = 0;
    do m = i + (l - i) / 2, d = F0(m, r, f) - a, d > 0 ? l = m : i = m; while (Math.abs(d) > Rb && ++h < Ob);
    return m
}

function zl(a, i, l, r) {
    if (a === i && l === r) return Vn;
    const f = d => zb(d, 0, 1, a, l);
    return d => d === 0 || d === 1 ? d : F0(f(d), i, r)
}
const J0 = a => i => i <= .5 ? a(2 * i) / 2 : (2 - a(2 * (1 - i))) / 2,
    $0 = a => i => 1 - a(1 - i),
    I0 = zl(.33, 1.53, .69, .99),
    Xf = $0(I0),
    W0 = J0(Xf),
    ey = a => a >= 1 ? 1 : (a *= 2) < 1 ? .5 * Xf(a) : .5 * (2 - Math.pow(2, -10 * (a - 1))),
    Kf = a => 1 - Math.sin(Math.acos(a)),
    ty = $0(Kf),
    ny = J0(Kf),
    _b = zl(.42, 0, 1, 1),
    Lb = zl(0, 0, .58, 1),
    ay = zl(.42, 0, .58, 1),
    Vb = a => Array.isArray(a) && typeof a[0] != "number",
    iy = a => Array.isArray(a) && typeof a[0] == "number",
    Bb = {
        linear: Vn,
        easeIn: _b,
        easeInOut: ay,
        easeOut: Lb,
        circIn: Kf,
        circInOut: ny,
        circOut: ty,
        backIn: Xf,
        backInOut: W0,
        backOut: I0,
        anticipate: ey
    },
    Ub = a => typeof a == "string",
    fg = a => {
        if (iy(a)) {
            qf(a.length === 4);
            const [i, l, r, f] = a;
            return zl(i, l, r, f)
        } else if (Ub(a)) return Bb[a];
        return a
    },
    Jr = ["setup", "read", "resolveKeyframes", "preUpdate", "update", "preRender", "render", "postRender"];

function Hb(a, i) {
    let l = new Set,
        r = new Set,
        f = !1,
        d = !1;
    const m = new WeakSet;
    let h = {
        delta: 0,
        timestamp: 0,
        isProcessing: !1
    };

    function x(g) {
        m.has(g) && (y.schedule(g), a()), g(h)
    }
    const y = {
        schedule: (g, b = !1, S = !1) => {
            const A = S && f ? l : r;
            return b && m.add(g), A.add(g), g
        },
        cancel: g => {
            r.delete(g), m.delete(g)
        },
        process: g => {
            if (h = g, f) {
                d = !0;
                return
            }
            f = !0;
            const b = l;
            l = r, r = b, l.forEach(x), l.clear(), f = !1, d && (d = !1, y.process(g))
        }
    };
    return y
}
const Gb = 40;

function sy(a, i) {
    let l = !1,
        r = !0;
    const f = {
            delta: 0,
            timestamp: 0,
            isProcessing: !1
        },
        d = () => l = !0,
        m = Jr.reduce((P, W) => (P[W] = Hb(d), P), {}),
        {
            setup: h,
            read: x,
            resolveKeyframes: y,
            preUpdate: g,
            update: b,
            preRender: S,
            render: j,
            postRender: A
        } = m,
        G = () => {
            const P = ai.useManualTiming,
                W = P ? f.timestamp : performance.now();
            l = !1, P || (f.delta = r ? 1e3 / 60 : Math.max(Math.min(W - f.timestamp, Gb), 1)), f.timestamp = W, f.isProcessing = !0, h.process(f), x.process(f), y.process(f), g.process(f), b.process(f), S.process(f), j.process(f), A.process(f), f.isProcessing = !1, l && i && (r = !1, a(G))
        },
        Y = () => {
            l = !0, r = !0, f.isProcessing || a(G)
        };
    return {
        schedule: Jr.reduce((P, W) => {
            const se = m[W];
            return P[W] = (he, $ = !1, ne = !1) => (l || Y(), se.schedule(he, $, ne)), P
        }, {}),
        cancel: P => {
            for (let W = 0; W < Jr.length; W++) m[Jr[W]].cancel(P)
        },
        state: f,
        steps: m
    }
}
const {
    schedule: lt,
    cancel: ii,
    state: Wt,
    steps: Xu
} = sy(typeof requestAnimationFrame < "u" ? requestAnimationFrame : Vn, !0);
let so;

function Yb() {
    so = void 0
}
const ln = {
        now: () => (so === void 0 && ln.set(Wt.isProcessing || ai.useManualTiming ? Wt.timestamp : performance.now()), so),
        set: a => {
            so = a, queueMicrotask(Yb)
        }
    },
    ly = a => i => typeof i == "string" && i.startsWith(a),
    ry = ly("--"),
    qb = ly("var(--"),
    Zf = a => qb(a) ? kb.test(a.split("/*")[0].trim()) : !1,
    kb = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;

function dg(a) {
    return typeof a != "string" ? !1 : a.split("/*")[0].includes("var(--")
}
const Ts = {
        test: a => typeof a == "number",
        parse: parseFloat,
        transform: a => a
    },
    El = {
        ...Ts,
        transform: a => na(0, 1, a)
    },
    $r = {
        ...Ts,
        default: 1
    },
    Nl = a => Math.round(a * 1e5) / 1e5,
    Qf = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;

function Xb(a) {
    return a == null
}
const Kb = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu,
    Pf = (a, i) => l => !!(typeof l == "string" && Kb.test(l) && l.startsWith(a) || i && !Xb(l) && Object.prototype.hasOwnProperty.call(l, i)),
    oy = (a, i, l) => r => {
        if (typeof r != "string") return r;
        const [f, d, m, h] = r.match(Qf);
        return {
            [a]: parseFloat(f),
            [i]: parseFloat(d),
            [l]: parseFloat(m),
            alpha: h !== void 0 ? parseFloat(h) : 1
        }
    },
    Zb = a => na(0, 255, a),
    Ku = {
        ...Ts,
        transform: a => Math.round(Zb(a))
    },
    Oi = {
        test: Pf("rgb", "red"),
        parse: oy("red", "green", "blue"),
        transform: ({
            red: a,
            green: i,
            blue: l,
            alpha: r = 1
        }) => "rgba(" + Ku.transform(a) + ", " + Ku.transform(i) + ", " + Ku.transform(l) + ", " + Nl(El.transform(r)) + ")"
    };

function Qb(a) {
    let i = "",
        l = "",
        r = "",
        f = "";
    return a.length > 5 ? (i = a.substring(1, 3), l = a.substring(3, 5), r = a.substring(5, 7), f = a.substring(7, 9)) : (i = a.substring(1, 2), l = a.substring(2, 3), r = a.substring(3, 4), f = a.substring(4, 5), i += i, l += l, r += r, f += f), {
        red: parseInt(i, 16),
        green: parseInt(l, 16),
        blue: parseInt(r, 16),
        alpha: f ? parseInt(f, 16) / 255 : 1
    }
}
const mf = {
        test: Pf("#"),
        parse: Qb,
        transform: Oi.transform
    },
    _l = a => ({
        test: i => typeof i == "string" && i.endsWith(a) && i.split(" ").length === 1,
        parse: parseFloat,
        transform: i => `${i}${a}`
    }),
    Ia = _l("deg"),
    ta = _l("%"),
    de = _l("px"),
    Pb = _l("vh"),
    Fb = _l("vw"),
    mg = {
        ...ta,
        parse: a => ta.parse(a) / 100,
        transform: a => ta.transform(a * 100)
    },
    gs = {
        test: Pf("hsl", "hue"),
        parse: oy("hue", "saturation", "lightness"),
        transform: ({
            hue: a,
            saturation: i,
            lightness: l,
            alpha: r = 1
        }) => "hsla(" + Math.round(a) + ", " + ta.transform(Nl(i)) + ", " + ta.transform(Nl(l)) + ", " + Nl(El.transform(r)) + ")"
    },
    Ot = {
        test: a => Oi.test(a) || mf.test(a) || gs.test(a),
        parse: a => Oi.test(a) ? Oi.parse(a) : gs.test(a) ? gs.parse(a) : mf.parse(a),
        transform: a => typeof a == "string" ? a : a.hasOwnProperty("red") ? Oi.transform(a) : gs.transform(a),
        getAnimatableNone: a => {
            const i = Ot.parse(a);
            return i.alpha = 0, Ot.transform(i)
        }
    },
    Jb = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;

function $b(a) {
    var i, l;
    return isNaN(a) && typeof a == "string" && (((i = a.match(Qf)) == null ? void 0 : i.length) || 0) + (((l = a.match(Jb)) == null ? void 0 : l.length) || 0) > 0
}
const cy = "number",
    uy = "color",
    Ib = "var",
    Wb = "var(",
    hg = "${}",
    e2 = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;

function bs(a) {
    const i = a.toString(),
        l = [],
        r = {
            color: [],
            number: [],
            var: []
        },
        f = [];
    let d = 0;
    const h = i.replace(e2, x => (Ot.test(x) ? (r.color.push(d), f.push(uy), l.push(Ot.parse(x))) : x.startsWith(Wb) ? (r.var.push(d), f.push(Ib), l.push(x)) : (r.number.push(d), f.push(cy), l.push(parseFloat(x))), ++d, hg)).split(hg);
    return {
        values: l,
        split: h,
        indexes: r,
        types: f
    }
}

function t2(a) {
    return bs(a).values
}

function fy({
    split: a,
    types: i
}) {
    const l = a.length;
    return r => {
        let f = "";
        for (let d = 0; d < l; d++)
            if (f += a[d], r[d] !== void 0) {
                const m = i[d];
                m === cy ? f += Nl(r[d]) : m === uy ? f += Ot.transform(r[d]) : f += r[d]
            } return f
    }
}

function n2(a) {
    return fy(bs(a))
}
const a2 = a => typeof a == "number" ? 0 : Ot.test(a) ? Ot.getAnimatableNone(a) : a,
    i2 = (a, i) => typeof a == "number" ? i != null && i.trim().endsWith("/") ? a : 0 : a2(a);

function s2(a) {
    const i = bs(a);
    return fy(i)(i.values.map((r, f) => i2(r, i.split[f])))
}
const Kn = {
    test: $b,
    parse: t2,
    createTransformer: n2,
    getAnimatableNone: s2
};

function Zu(a, i, l) {
    return l < 0 && (l += 1), l > 1 && (l -= 1), l < 1 / 6 ? a + (i - a) * 6 * l : l < 1 / 2 ? i : l < 2 / 3 ? a + (i - a) * (2 / 3 - l) * 6 : a
}

function l2({
    hue: a,
    saturation: i,
    lightness: l,
    alpha: r
}) {
    a /= 360, i /= 100, l /= 100;
    let f = 0,
        d = 0,
        m = 0;
    if (!i) f = d = m = l;
    else {
        const h = l < .5 ? l * (1 + i) : l + i - l * i,
            x = 2 * l - h;
        f = Zu(x, h, a + 1 / 3), d = Zu(x, h, a), m = Zu(x, h, a - 1 / 3)
    }
    return {
        red: Math.round(f * 255),
        green: Math.round(d * 255),
        blue: Math.round(m * 255),
        alpha: r
    }
}

function go(a, i) {
    return l => l > 0 ? i : a
}
const ft = (a, i, l) => a + (i - a) * l,
    Qu = (a, i, l) => {
        const r = a * a,
            f = l * (i * i - r) + r;
        return f < 0 ? 0 : Math.sqrt(f)
    },
    r2 = [mf, Oi, gs],
    o2 = a => r2.find(i => i.test(a));

function pg(a) {
    const i = o2(a);
    if (!i) return !1;
    let l = i.parse(a);
    return i === gs && (l = l2(l)), l
}
const gg = (a, i) => {
        const l = pg(a),
            r = pg(i);
        if (!l || !r) return go(a, i);
        const f = {
            ...l
        };
        return d => (f.red = Qu(l.red, r.red, d), f.green = Qu(l.green, r.green, d), f.blue = Qu(l.blue, r.blue, d), f.alpha = ft(l.alpha, r.alpha, d), Oi.transform(f))
    },
    hf = new Set(["none", "hidden"]);

function c2(a, i) {
    return hf.has(a) ? l => l <= 0 ? a : i : l => l >= 1 ? i : a
}

function u2(a, i) {
    return l => ft(a, i, l)
}

function Ff(a) {
    return typeof a == "number" ? u2 : typeof a == "string" ? Zf(a) ? go : Ot.test(a) ? gg : m2 : Array.isArray(a) ? dy : typeof a == "object" ? Ot.test(a) ? gg : f2 : go
}

function dy(a, i) {
    const l = [...a],
        r = l.length,
        f = a.map((d, m) => Ff(d)(d, i[m]));
    return d => {
        for (let m = 0; m < r; m++) l[m] = f[m](d);
        return l
    }
}

function f2(a, i) {
    const l = {
            ...a,
            ...i
        },
        r = {};
    for (const f in l) a[f] !== void 0 && i[f] !== void 0 && (r[f] = Ff(a[f])(a[f], i[f]));
    return f => {
        for (const d in r) l[d] = r[d](f);
        return l
    }
}

function d2(a, i) {
    const l = [],
        r = {
            color: 0,
            var: 0,
            number: 0
        };
    for (let f = 0; f < i.values.length; f++) {
        const d = i.types[f],
            m = a.indexes[d][r[d]],
            h = a.values[m] ?? 0;
        l[f] = h, r[d]++
    }
    return l
}
const m2 = (a, i) => {
    const l = Kn.createTransformer(i),
        r = bs(a),
        f = bs(i);
    return r.indexes.var.length === f.indexes.var.length && r.indexes.color.length === f.indexes.color.length && r.indexes.number.length >= f.indexes.number.length ? hf.has(a) && !f.values.length || hf.has(i) && !r.values.length ? c2(a, i) : Ol(dy(d2(r, f), f.values), l) : go(a, i)
};

function my(a, i, l) {
    return typeof a == "number" && typeof i == "number" && typeof l == "number" ? ft(a, i, l) : Ff(a)(a, i)
}
const h2 = a => {
        const i = ({
            timestamp: l
        }) => a(l);
        return {
            start: (l = !0) => lt.update(i, l),
            stop: () => ii(i),
            now: () => Wt.isProcessing ? Wt.timestamp : ln.now()
        }
    },
    hy = (a, i, l = 10) => {
        let r = "";
        const f = Math.max(Math.round(i / l), 2);
        for (let d = 0; d < f; d++) r += Math.round(a(d / (f - 1)) * 1e4) / 1e4 + ", ";
        return `linear(${r.substring(0,r.length-2)})`
    },
    yo = 2e4;

function Jf(a) {
    let i = 0;
    const l = 50;
    let r = a.next(i);
    for (; !r.done && i < yo;) i += l, r = a.next(i);
    return i >= yo ? 1 / 0 : i
}

function p2(a, i = 100, l) {
    const r = l({
            ...a,
            keyframes: [0, i]
        }),
        f = Math.min(Jf(r), yo);
    return {
        type: "keyframes",
        ease: d => r.next(f * d).value / i,
        duration: Ln(f)
    }
}
const bt = {
    stiffness: 100,
    damping: 10,
    mass: 1,
    velocity: 0,
    duration: 800,
    bounce: .3,
    visualDuration: .3,
    restSpeed: {
        granular: .01,
        default: 2
    },
    restDelta: {
        granular: .005,
        default: .5
    },
    minDuration: .01,
    maxDuration: 10,
    minDamping: .05,
    maxDamping: 1
};

function pf(a, i) {
    return a * Math.sqrt(1 - i * i)
}
const g2 = 12;

function y2(a, i, l) {
    let r = l;
    for (let f = 1; f < g2; f++) r = r - a(r) / i(r);
    return r
}
const Pu = .001;

function x2({
    duration: a = bt.duration,
    bounce: i = bt.bounce,
    velocity: l = bt.velocity,
    mass: r = bt.mass
}) {
    let f, d, m = 1 - i;
    m = na(bt.minDamping, bt.maxDamping, m), a = na(bt.minDuration, bt.maxDuration, Ln(a)), m < 1 ? (f = y => {
        const g = y * m,
            b = g * a,
            S = g - l,
            j = pf(y, m),
            A = Math.exp(-b);
        return Pu - S / j * A
    }, d = y => {
        const b = y * m * a,
            S = b * l + l,
            j = Math.pow(m, 2) * Math.pow(y, 2) * a,
            A = Math.exp(-b),
            G = pf(Math.pow(y, 2), m);
        return (-f(y) + Pu > 0 ? -1 : 1) * ((S - j) * A) / G
    }) : (f = y => {
        const g = Math.exp(-y * a),
            b = (y - l) * a + 1;
        return -Pu + g * b
    }, d = y => {
        const g = Math.exp(-y * a),
            b = (l - y) * (a * a);
        return g * b
    });
    const h = 5 / a,
        x = y2(f, d, h);
    if (a = Tn(a), isNaN(x)) return {
        stiffness: bt.stiffness,
        damping: bt.damping,
        duration: a
    };
    {
        const y = Math.pow(x, 2) * r;
        return {
            stiffness: y,
            damping: m * 2 * Math.sqrt(r * y),
            duration: a
        }
    }
}
const v2 = ["duration", "bounce"],
    b2 = ["stiffness", "damping", "mass"];

function yg(a, i) {
    return i.some(l => a[l] !== void 0)
}

function S2(a) {
    let i = {
        velocity: bt.velocity,
        stiffness: bt.stiffness,
        damping: bt.damping,
        mass: bt.mass,
        isResolvedFromDuration: !1,
        ...a
    };
    if (!yg(a, b2) && yg(a, v2))
        if (i.velocity = 0, a.visualDuration) {
            const l = a.visualDuration,
                r = 2 * Math.PI / (l * 1.2),
                f = r * r,
                d = 2 * na(.05, 1, 1 - (a.bounce || 0)) * Math.sqrt(f);
            i = {
                ...i,
                mass: bt.mass,
                stiffness: f,
                damping: d
            }
        } else {
            const l = x2({
                ...a,
                velocity: 0
            });
            i = {
                ...i,
                ...l,
                mass: bt.mass
            }, i.isResolvedFromDuration = !0
        } return i
}

function xo(a = bt.visualDuration, i = bt.bounce) {
    const l = typeof a != "object" ? {
        visualDuration: a,
        keyframes: [0, 1],
        bounce: i
    } : a;
    let {
        restSpeed: r,
        restDelta: f
    } = l;
    const d = l.keyframes[0],
        m = l.keyframes[l.keyframes.length - 1],
        h = {
            done: !1,
            value: d
        },
        {
            stiffness: x,
            damping: y,
            mass: g,
            duration: b,
            velocity: S,
            isResolvedFromDuration: j
        } = S2({
            ...l,
            velocity: -Ln(l.velocity || 0)
        }),
        A = S || 0,
        G = y / (2 * Math.sqrt(x * g)),
        Y = m - d,
        U = Ln(Math.sqrt(x / g)),
        I = Math.abs(Y) < 5;
    r || (r = I ? bt.restSpeed.granular : bt.restSpeed.default), f || (f = I ? bt.restDelta.granular : bt.restDelta.default);
    let P, W, se, he, $, ne;
    if (G < 1) se = pf(U, G), he = (A + G * U * Y) / se, P = te => {
        const Me = Math.exp(-G * U * te);
        return m - Me * (he * Math.sin(se * te) + Y * Math.cos(se * te))
    }, $ = G * U * he + Y * se, ne = G * U * Y - he * se, W = te => Math.exp(-G * U * te) * ($ * Math.sin(se * te) + ne * Math.cos(se * te));
    else if (G === 1) {
        P = Me => m - Math.exp(-U * Me) * (Y + (A + U * Y) * Me);
        const te = A + U * Y;
        W = Me => Math.exp(-U * Me) * (U * te * Me - A)
    } else {
        const te = U * Math.sqrt(G * G - 1);
        P = ze => {
            const Ae = Math.exp(-G * U * ze),
                O = Math.min(te * ze, 300);
            return m - Ae * ((A + G * U * Y) * Math.sinh(O) + te * Y * Math.cosh(O)) / te
        };
        const Me = (A + G * U * Y) / te,
            Se = G * U * Me - Y * te,
            Fe = G * U * Y - Me * te;
        W = ze => {
            const Ae = Math.exp(-G * U * ze),
                O = Math.min(te * ze, 300);
            return Ae * (Se * Math.sinh(O) + Fe * Math.cosh(O))
        }
    }
    const ce = {
        calculatedDuration: j && b || null,
        velocity: te => Tn(W(te)),
        next: te => {
            if (!j && G < 1) {
                const Se = Math.exp(-G * U * te),
                    Fe = Math.sin(se * te),
                    ze = Math.cos(se * te),
                    Ae = m - Se * (he * Fe + Y * ze),
                    O = Tn(Se * ($ * Fe + ne * ze));
                return h.done = Math.abs(O) <= r && Math.abs(m - Ae) <= f, h.value = h.done ? m : Ae, h
            }
            const Me = P(te);
            if (j) h.done = te >= b;
            else {
                const Se = Tn(W(te));
                h.done = Math.abs(Se) <= r && Math.abs(m - Me) <= f
            }
            return h.value = h.done ? m : Me, h
        },
        toString: () => {
            const te = Math.min(Jf(ce), yo),
                Me = hy(Se => ce.next(te * Se).value, te, 30);
            return te + "ms " + Me
        },
        toTransition: () => {}
    };
    return ce
}
xo.applyToOptions = a => {
    const i = p2(a, 100, xo);
    return a.ease = i.ease, a.duration = Tn(i.duration), a.type = "keyframes", a
};
const T2 = 5;

function py(a, i, l) {
    const r = Math.max(i - T2, 0);
    return P0(l - a(r), i - r)
}

function gf({
    keyframes: a,
    velocity: i = 0,
    power: l = .8,
    timeConstant: r = 325,
    bounceDamping: f = 10,
    bounceStiffness: d = 500,
    modifyTarget: m,
    min: h,
    max: x,
    restDelta: y = .5,
    restSpeed: g
}) {
    const b = a[0],
        S = {
            done: !1,
            value: b
        },
        j = ne => h !== void 0 && ne < h || x !== void 0 && ne > x,
        A = ne => h === void 0 ? x : x === void 0 || Math.abs(h - ne) < Math.abs(x - ne) ? h : x;
    let G = l * i;
    const Y = b + G,
        U = m === void 0 ? Y : m(Y);
    U !== Y && (G = U - b);
    const I = ne => -G * Math.exp(-ne / r),
        P = ne => U + I(ne),
        W = ne => {
            const ce = I(ne),
                te = P(ne);
            S.done = Math.abs(ce) <= y, S.value = S.done ? U : te
        };
    let se, he;
    const $ = ne => {
        j(S.value) && (se = ne, he = xo({
            keyframes: [S.value, A(S.value)],
            velocity: py(P, ne, S.value),
            damping: f,
            stiffness: d,
            restDelta: y,
            restSpeed: g
        }))
    };
    return $(0), {
        calculatedDuration: null,
        next: ne => {
            let ce = !1;
            return !he && se === void 0 && (ce = !0, W(ne), $(ne)), se !== void 0 && ne >= se ? he.next(ne - se) : (!ce && W(ne), S)
        }
    }
}

function N2(a, i, l) {
    const r = [],
        f = l || ai.mix || my,
        d = a.length - 1;
    for (let m = 0; m < d; m++) {
        let h = f(a[m], a[m + 1]);
        if (i) {
            const x = Array.isArray(i) ? i[m] || Vn : i;
            h = Ol(x, h)
        }
        r.push(h)
    }
    return r
}

function j2(a, i, {
    clamp: l = !0,
    ease: r,
    mixer: f
} = {}) {
    const d = a.length;
    if (qf(d === i.length), d === 1) return () => i[0];
    if (d === 2 && i[0] === i[1]) return () => i[1];
    const m = a[0] === a[1];
    a[0] > a[d - 1] && (a = [...a].reverse(), i = [...i].reverse());
    const h = N2(i, r, f),
        x = h.length,
        y = g => {
            if (m && g < a[0]) return i[0];
            let b = 0;
            if (x > 1)
                for (; b < a.length - 2 && !(g < a[b + 1]); b++);
            const S = Al(a[b], a[b + 1], g);
            return h[b](S)
        };
    return l ? g => y(na(a[0], a[d - 1], g)) : y
}

function M2(a, i) {
    const l = a[a.length - 1];
    for (let r = 1; r <= i; r++) {
        const f = Al(0, i, r);
        a.push(ft(l, 1, f))
    }
}

function w2(a) {
    const i = [0];
    return M2(i, a.length - 1), i
}

function A2(a, i) {
    return a.map(l => l * i)
}

function E2(a, i) {
    return a.map(() => i || ay).splice(0, a.length - 1)
}

function jl({
    duration: a = 300,
    keyframes: i,
    times: l,
    ease: r = "easeInOut"
}) {
    const f = Vb(r) ? r.map(fg) : fg(r),
        d = {
            done: !1,
            value: i[0]
        },
        m = A2(l && l.length === i.length ? l : w2(i), a),
        h = j2(m, i, {
            ease: Array.isArray(f) ? f : E2(i, f)
        });
    return {
        calculatedDuration: a,
        next: x => (d.value = h(x), d.done = x >= a, d)
    }
}
const C2 = a => a !== null;

function Ao(a, {
    repeat: i,
    repeatType: l = "loop"
}, r, f = 1) {
    const d = a.filter(C2),
        h = f < 0 || i && l !== "loop" && i % 2 === 1 ? 0 : d.length - 1;
    return !h || r === void 0 ? d[h] : r
}
const D2 = {
    decay: gf,
    inertia: gf,
    tween: jl,
    keyframes: jl,
    spring: xo
};

function gy(a) {
    typeof a.type == "string" && (a.type = D2[a.type])
}
class $f {
    constructor() {
        this.updateFinished()
    }
    get finished() {
        return this._finished
    }
    updateFinished() {
        this._finished = new Promise(i => {
            this.resolve = i
        })
    }
    notifyFinished() {
        this.resolve()
    }
    then(i, l) {
        return this.finished.then(i, l)
    }
}
const R2 = a => a / 100;
class vo extends $f {
    constructor(i) {
        super(), this.state = "idle", this.startTime = null, this.isStopped = !1, this.currentTime = 0, this.holdTime = null, this.playbackSpeed = 1, this.delayState = {
            done: !1,
            value: void 0
        }, this.stop = () => {
            var r, f;
            const {
                motionValue: l
            } = this.options;
            l && l.updatedAt !== ln.now() && this.tick(ln.now()), this.isStopped = !0, this.state !== "idle" && (this.teardown(), (f = (r = this.options).onStop) == null || f.call(r))
        }, this.options = i, this.initAnimation(), this.play(), i.autoplay === !1 && this.pause()
    }
    initAnimation() {
        const {
            options: i
        } = this;
        gy(i);
        const {
            type: l = jl,
            repeat: r = 0,
            repeatDelay: f = 0,
            repeatType: d,
            velocity: m = 0
        } = i;
        let {
            keyframes: h
        } = i;
        const x = l || jl;
        x !== jl && typeof h[0] != "number" && (this.mixKeyframes = Ol(R2, my(h[0], h[1])), h = [0, 100]);
        const y = x({
            ...i,
            keyframes: h
        });
        d === "mirror" && (this.mirroredGenerator = x({
            ...i,
            keyframes: [...h].reverse(),
            velocity: -m
        })), y.calculatedDuration === null && (y.calculatedDuration = Jf(y));
        const {
            calculatedDuration: g
        } = y;
        this.calculatedDuration = g, this.resolvedDuration = g + f, this.totalDuration = this.resolvedDuration * (r + 1) - f, this.generator = y
    }
    updateTime(i) {
        const l = Math.round(i - this.startTime) * this.playbackSpeed;
        this.holdTime !== null ? this.currentTime = this.holdTime : this.currentTime = l
    }
    tick(i, l = !1) {
        const {
            generator: r,
            totalDuration: f,
            mixKeyframes: d,
            mirroredGenerator: m,
            resolvedDuration: h,
            calculatedDuration: x
        } = this;
        if (this.startTime === null) return r.next(0);
        const {
            delay: y = 0,
            keyframes: g,
            repeat: b,
            repeatType: S,
            repeatDelay: j,
            type: A,
            onUpdate: G,
            finalKeyframe: Y
        } = this.options;
        this.speed > 0 ? this.startTime = Math.min(this.startTime, i) : this.speed < 0 && (this.startTime = Math.min(i - f / this.speed, this.startTime)), l ? this.currentTime = i : this.updateTime(i);
        const U = this.currentTime - y * (this.playbackSpeed >= 0 ? 1 : -1),
            I = this.playbackSpeed >= 0 ? U < 0 : U > f;
        this.currentTime = Math.max(U, 0), this.state === "finished" && this.holdTime === null && (this.currentTime = f);
        let P = this.currentTime,
            W = r;
        if (b) {
            const ne = Math.min(this.currentTime, f) / h;
            let ce = Math.floor(ne),
                te = ne % 1;
            !te && ne >= 1 && (te = 1), te === 1 && ce--, ce = Math.min(ce, b + 1), !!(ce % 2) && (S === "reverse" ? (te = 1 - te, j && (te -= j / h)) : S === "mirror" && (W = m)), P = na(0, 1, te) * h
        }
        let se;
        I ? (this.delayState.value = g[0], se = this.delayState) : se = W.next(P), d && !I && (se.value = d(se.value));
        let {
            done: he
        } = se;
        !I && x !== null && (he = this.playbackSpeed >= 0 ? this.currentTime >= f : this.currentTime <= 0);
        const $ = this.holdTime === null && (this.state === "finished" || this.state === "running" && he);
        return $ && A !== gf && (se.value = Ao(g, this.options, Y, this.speed)), G && G(se.value), $ && this.finish(), se
    }
    then(i, l) {
        return this.finished.then(i, l)
    }
    get duration() {
        return Ln(this.calculatedDuration)
    }
    get iterationDuration() {
        const {
            delay: i = 0
        } = this.options || {};
        return this.duration + Ln(i)
    }
    get time() {
        return Ln(this.currentTime)
    }
    set time(i) {
        i = Tn(i), this.currentTime = i, this.startTime === null || this.holdTime !== null || this.playbackSpeed === 0 ? this.holdTime = i : this.driver && (this.startTime = this.driver.now() - i / this.playbackSpeed), this.driver ? this.driver.start(!1) : (this.startTime = 0, this.state = "paused", this.holdTime = i, this.tick(i))
    }
    getGeneratorVelocity() {
        const i = this.currentTime;
        if (i <= 0) return this.options.velocity || 0;
        if (this.generator.velocity) return this.generator.velocity(i);
        const l = this.generator.next(i).value;
        return py(r => this.generator.next(r).value, i, l)
    }
    get speed() {
        return this.playbackSpeed
    }
    set speed(i) {
        const l = this.playbackSpeed !== i;
        l && this.driver && this.updateTime(ln.now()), this.playbackSpeed = i, l && this.driver && (this.time = Ln(this.currentTime))
    }
    play() {
        var f, d;
        if (this.isStopped) return;
        const {
            driver: i = h2,
            startTime: l
        } = this.options;
        this.driver || (this.driver = i(m => this.tick(m))), (d = (f = this.options).onPlay) == null || d.call(f);
        const r = this.driver.now();
        this.state === "finished" ? (this.updateFinished(), this.startTime = r) : this.holdTime !== null ? this.startTime = r - this.holdTime : this.startTime || (this.startTime = l ?? r), this.state === "finished" && this.speed < 0 && (this.startTime += this.calculatedDuration), this.holdTime = null, this.state = "running", this.driver.start()
    }
    pause() {
        this.state = "paused", this.updateTime(ln.now()), this.holdTime = this.currentTime
    }
    complete() {
        this.state !== "running" && this.play(), this.state = "finished", this.holdTime = null
    }
    finish() {
        var i, l;
        this.notifyFinished(), this.teardown(), this.state = "finished", (l = (i = this.options).onComplete) == null || l.call(i)
    }
    cancel() {
        var i, l;
        this.holdTime = null, this.startTime = 0, this.tick(0), this.teardown(), (l = (i = this.options).onCancel) == null || l.call(i)
    }
    teardown() {
        this.state = "idle", this.stopDriver(), this.startTime = this.holdTime = null
    }
    stopDriver() {
        this.driver && (this.driver.stop(), this.driver = void 0)
    }
    sample(i) {
        return this.startTime = 0, this.tick(i, !0)
    }
    attachTimeline(i) {
        var l;
        return this.options.allowFlatten && (this.options.type = "keyframes", this.options.ease = "linear", this.initAnimation()), (l = this.driver) == null || l.stop(), i.observe(this)
    }
}

function O2(a) {
    for (let i = 1; i < a.length; i++) a[i] ?? (a[i] = a[i - 1])
}
const zi = a => a * 180 / Math.PI,
    yf = a => {
        const i = zi(Math.atan2(a[1], a[0]));
        return xf(i)
    },
    z2 = {
        x: 4,
        y: 5,
        translateX: 4,
        translateY: 5,
        scaleX: 0,
        scaleY: 3,
        scale: a => (Math.abs(a[0]) + Math.abs(a[3])) / 2,
        rotate: yf,
        rotateZ: yf,
        skewX: a => zi(Math.atan(a[1])),
        skewY: a => zi(Math.atan(a[2])),
        skew: a => (Math.abs(a[1]) + Math.abs(a[2])) / 2
    },
    xf = a => (a = a % 360, a < 0 && (a += 360), a),
    xg = yf,
    vg = a => Math.sqrt(a[0] * a[0] + a[1] * a[1]),
    bg = a => Math.sqrt(a[4] * a[4] + a[5] * a[5]),
    _2 = {
        x: 12,
        y: 13,
        z: 14,
        translateX: 12,
        translateY: 13,
        translateZ: 14,
        scaleX: vg,
        scaleY: bg,
        scale: a => (vg(a) + bg(a)) / 2,
        rotateX: a => xf(zi(Math.atan2(a[6], a[5]))),
        rotateY: a => xf(zi(Math.atan2(-a[2], a[0]))),
        rotateZ: xg,
        rotate: xg,
        skewX: a => zi(Math.atan(a[4])),
        skewY: a => zi(Math.atan(a[1])),
        skew: a => (Math.abs(a[1]) + Math.abs(a[4])) / 2
    };

function vf(a) {
    return a.includes("scale") ? 1 : 0
}

function bf(a, i) {
    if (!a || a === "none") return vf(i);
    const l = a.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
    let r, f;
    if (l) r = _2, f = l;
    else {
        const h = a.match(/^matrix\(([-\d.e\s,]+)\)$/u);
        r = z2, f = h
    }
    if (!f) return vf(i);
    const d = r[i],
        m = f[1].split(",").map(V2);
    return typeof d == "function" ? d(m) : m[d]
}
const L2 = (a, i) => {
    const {
        transform: l = "none"
    } = getComputedStyle(a);
    return bf(l, i)
};

function V2(a) {
    return parseFloat(a.trim())
}
const Ns = ["transformPerspective", "x", "y", "z", "translateX", "translateY", "translateZ", "scale", "scaleX", "scaleY", "rotate", "rotateX", "rotateY", "rotateZ", "skew", "skewX", "skewY"],
    js = new Set(Ns),
    Sg = a => a === Ts || a === de,
    B2 = new Set(["x", "y", "z"]),
    U2 = Ns.filter(a => !B2.has(a));

function H2(a) {
    const i = [];
    return U2.forEach(l => {
        const r = a.getValue(l);
        r !== void 0 && (i.push([l, r.get()]), r.set(l.startsWith("scale") ? 1 : 0))
    }), i
}
const ei = {
    width: ({
        x: a
    }, {
        paddingLeft: i = "0",
        paddingRight: l = "0",
        boxSizing: r
    }) => {
        const f = a.max - a.min;
        return r === "border-box" ? f : f - parseFloat(i) - parseFloat(l)
    },
    height: ({
        y: a
    }, {
        paddingTop: i = "0",
        paddingBottom: l = "0",
        boxSizing: r
    }) => {
        const f = a.max - a.min;
        return r === "border-box" ? f : f - parseFloat(i) - parseFloat(l)
    },
    top: (a, {
        top: i
    }) => parseFloat(i),
    left: (a, {
        left: i
    }) => parseFloat(i),
    bottom: ({
        y: a
    }, {
        top: i
    }) => parseFloat(i) + (a.max - a.min),
    right: ({
        x: a
    }, {
        left: i
    }) => parseFloat(i) + (a.max - a.min),
    x: (a, {
        transform: i
    }) => bf(i, "x"),
    y: (a, {
        transform: i
    }) => bf(i, "y")
};
ei.translateX = ei.x;
ei.translateY = ei.y;
const _i = new Set;
let Sf = !1,
    Tf = !1,
    Nf = !1;

function yy() {
    if (Tf) {
        const a = Array.from(_i).filter(r => r.needsMeasurement),
            i = new Set(a.map(r => r.element)),
            l = new Map;
        i.forEach(r => {
            const f = H2(r);
            f.length && (l.set(r, f), r.render())
        }), a.forEach(r => r.measureInitialState()), i.forEach(r => {
            r.render();
            const f = l.get(r);
            f && f.forEach(([d, m]) => {
                var h;
                (h = r.getValue(d)) == null || h.set(m)
            })
        }), a.forEach(r => r.measureEndState()), a.forEach(r => {
            r.suspendedScrollY !== void 0 && window.scrollTo(0, r.suspendedScrollY)
        })
    }
    Tf = !1, Sf = !1, _i.forEach(a => a.complete(Nf)), _i.clear()
}

function xy() {
    _i.forEach(a => {
        a.readKeyframes(), a.needsMeasurement && (Tf = !0)
    })
}

function G2() {
    Nf = !0, xy(), yy(), Nf = !1
}
class If {
    constructor(i, l, r, f, d, m = !1) {
        this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...i], this.onComplete = l, this.name = r, this.motionValue = f, this.element = d, this.isAsync = m
    }
    scheduleResolve() {
        this.state = "scheduled", this.isAsync ? (_i.add(this), Sf || (Sf = !0, lt.read(xy), lt.resolveKeyframes(yy))) : (this.readKeyframes(), this.complete())
    }
    readKeyframes() {
        const {
            unresolvedKeyframes: i,
            name: l,
            element: r,
            motionValue: f
        } = this;
        if (i[0] === null) {
            const d = f == null ? void 0 : f.get(),
                m = i[i.length - 1];
            if (d !== void 0) i[0] = d;
            else if (r && l) {
                const h = r.readValue(l, m);
                h != null && (i[0] = h)
            }
            i[0] === void 0 && (i[0] = m), f && d === void 0 && f.set(i[0])
        }
        O2(i)
    }
    setFinalKeyframe() {}
    measureInitialState() {}
    renderEndStyles() {}
    measureEndState() {}
    complete(i = !1) {
        this.state = "complete", this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, i), _i.delete(this)
    }
    cancel() {
        this.state === "scheduled" && (_i.delete(this), this.state = "pending")
    }
    resume() {
        this.state === "pending" && this.scheduleResolve()
    }
}
const Y2 = a => a.startsWith("--");

function vy(a, i, l) {
    Y2(i) ? a.style.setProperty(i, l) : a.style[i] = l
}
const q2 = {};

function by(a, i) {
    const l = Q0(a);
    return () => q2[i] ?? l()
}
const k2 = by(() => window.ScrollTimeline !== void 0, "scrollTimeline"),
    Sy = by(() => {
        try {
            document.createElement("div").animate({
                opacity: 0
            }, {
                easing: "linear(0, 1)"
            })
        } catch {
            return !1
        }
        return !0
    }, "linearEasing"),
    xl = ([a, i, l, r]) => `cubic-bezier(${a}, ${i}, ${l}, ${r})`,
    Tg = {
        linear: "linear",
        ease: "ease",
        easeIn: "ease-in",
        easeOut: "ease-out",
        easeInOut: "ease-in-out",
        circIn: xl([0, .65, .55, 1]),
        circOut: xl([.55, 0, 1, .45]),
        backIn: xl([.31, .01, .66, -.59]),
        backOut: xl([.33, 1.53, .69, .99])
    };

function Ty(a, i) {
    if (a) return typeof a == "function" ? Sy() ? hy(a, i) : "ease-out" : iy(a) ? xl(a) : Array.isArray(a) ? a.map(l => Ty(l, i) || Tg.easeOut) : Tg[a]
}

function X2(a, i, l, {
    delay: r = 0,
    duration: f = 300,
    repeat: d = 0,
    repeatType: m = "loop",
    ease: h = "easeOut",
    times: x
} = {}, y = void 0) {
    const g = {
        [i]: l
    };
    x && (g.offset = x);
    const b = Ty(h, f);
    Array.isArray(b) && (g.easing = b);
    const S = {
        delay: r,
        duration: f,
        easing: Array.isArray(b) ? "linear" : b,
        fill: "both",
        iterations: d + 1,
        direction: m === "reverse" ? "alternate" : "normal"
    };
    return y && (S.pseudoElement = y), a.animate(g, S)
}

function Ny(a) {
    return typeof a == "function" && "applyToOptions" in a
}

function K2({
    type: a,
    ...i
}) {
    return Ny(a) && Sy() ? a.applyToOptions(i) : (i.duration ?? (i.duration = 300), i.ease ?? (i.ease = "easeOut"), i)
}
class jy extends $f {
    constructor(i) {
        if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !i) return;
        const {
            element: l,
            name: r,
            keyframes: f,
            pseudoElement: d,
            allowFlatten: m = !1,
            finalKeyframe: h,
            onComplete: x
        } = i;
        this.isPseudoElement = !!d, this.allowFlatten = m, this.options = i, qf(typeof i.type != "string");
        const y = K2(i);
        this.animation = X2(l, r, f, y, d), y.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
            if (this.finishedTime = this.time, !d) {
                const g = Ao(f, this.options, h, this.speed);
                this.updateMotionValue && this.updateMotionValue(g), vy(l, r, g), this.animation.cancel()
            }
            x == null || x(), this.notifyFinished()
        }
    }
    play() {
        this.isStopped || (this.manualStartTime = null, this.animation.play(), this.state === "finished" && this.updateFinished())
    }
    pause() {
        this.animation.pause()
    }
    complete() {
        var i, l;
        (l = (i = this.animation).finish) == null || l.call(i)
    }
    cancel() {
        try {
            this.animation.cancel()
        } catch {}
    }
    stop() {
        if (this.isStopped) return;
        this.isStopped = !0;
        const {
            state: i
        } = this;
        i === "idle" || i === "finished" || (this.updateMotionValue ? this.updateMotionValue() : this.commitStyles(), this.isPseudoElement || this.cancel())
    }
    commitStyles() {
        var l, r, f;
        const i = (l = this.options) == null ? void 0 : l.element;
        !this.isPseudoElement && (i != null && i.isConnected) && ((f = (r = this.animation).commitStyles) == null || f.call(r))
    }
    get duration() {
        var l, r;
        const i = ((r = (l = this.animation.effect) == null ? void 0 : l.getComputedTiming) == null ? void 0 : r.call(l).duration) || 0;
        return Ln(Number(i))
    }
    get iterationDuration() {
        const {
            delay: i = 0
        } = this.options || {};
        return this.duration + Ln(i)
    }
    get time() {
        return Ln(Number(this.animation.currentTime) || 0)
    }
    set time(i) {
        const l = this.finishedTime !== null;
        this.manualStartTime = null, this.finishedTime = null, this.animation.currentTime = Tn(i), l && this.animation.pause()
    }
    get speed() {
        return this.animation.playbackRate
    }
    set speed(i) {
        i < 0 && (this.finishedTime = null), this.animation.playbackRate = i
    }
    get state() {
        return this.finishedTime !== null ? "finished" : this.animation.playState
    }
    get startTime() {
        return this.manualStartTime ?? Number(this.animation.startTime)
    }
    set startTime(i) {
        this.manualStartTime = this.animation.startTime = i
    }
    attachTimeline({
        timeline: i,
        rangeStart: l,
        rangeEnd: r,
        observe: f
    }) {
        var d;
        return this.allowFlatten && ((d = this.animation.effect) == null || d.updateTiming({
            easing: "linear"
        })), this.animation.onfinish = null, i && k2() ? (this.animation.timeline = i, l && (this.animation.rangeStart = l), r && (this.animation.rangeEnd = r), Vn) : f(this)
    }
}
const My = {
    anticipate: ey,
    backInOut: W0,
    circInOut: ny
};

function Z2(a) {
    return a in My
}

function Q2(a) {
    typeof a.ease == "string" && Z2(a.ease) && (a.ease = My[a.ease])
}
const Fu = 10;
class P2 extends jy {
    constructor(i) {
        Q2(i), gy(i), super(i), i.startTime !== void 0 && i.autoplay !== !1 && (this.startTime = i.startTime), this.options = i
    }
    updateMotionValue(i) {
        const {
            motionValue: l,
            onUpdate: r,
            onComplete: f,
            element: d,
            ...m
        } = this.options;
        if (!l) return;
        if (i !== void 0) {
            l.set(i);
            return
        }
        const h = new vo({
                ...m,
                autoplay: !1
            }),
            x = Math.max(Fu, ln.now() - this.startTime),
            y = na(0, Fu, x - Fu),
            g = h.sample(x).value,
            {
                name: b
            } = this.options;
        d && b && vy(d, b, g), l.setWithVelocity(h.sample(Math.max(0, x - y)).value, g, y), h.stop()
    }
}
const Ng = (a, i) => i === "zIndex" ? !1 : !!(typeof a == "number" || Array.isArray(a) || typeof a == "string" && (Kn.test(a) || a === "0") && !a.startsWith("url("));

function F2(a) {
    const i = a[0];
    if (a.length === 1) return !0;
    for (let l = 0; l < a.length; l++)
        if (a[l] !== i) return !0
}

function J2(a, i, l, r) {
    const f = a[0];
    if (f === null) return !1;
    if (i === "display" || i === "visibility") return !0;
    const d = a[a.length - 1],
        m = Ng(f, i),
        h = Ng(d, i);
    return !m || !h ? !1 : F2(a) || (l === "spring" || Ny(l)) && r
}

function jf(a) {
    a.duration = 0, a.type = "keyframes"
}
const wy = new Set(["opacity", "clipPath", "filter", "transform"]),
    $2 = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;

function I2(a) {
    for (let i = 0; i < a.length; i++)
        if (typeof a[i] == "string" && $2.test(a[i])) return !0;
    return !1
}
const W2 = new Set(["color", "backgroundColor", "outlineColor", "fill", "stroke", "borderColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor"]),
    eS = Q0(() => Object.hasOwnProperty.call(Element.prototype, "animate"));

function tS(a) {
    var b;
    const {
        motionValue: i,
        name: l,
        repeatDelay: r,
        repeatType: f,
        damping: d,
        type: m,
        keyframes: h
    } = a;
    if (!(((b = i == null ? void 0 : i.owner) == null ? void 0 : b.current) instanceof HTMLElement)) return !1;
    const {
        onUpdate: y,
        transformTemplate: g
    } = i.owner.getProps();
    return eS() && l && (wy.has(l) || W2.has(l) && I2(h)) && (l !== "transform" || !g) && !y && !r && f !== "mirror" && d !== 0 && m !== "inertia"
}
const nS = 40;
class aS extends $f {
    constructor({
        autoplay: i = !0,
        delay: l = 0,
        type: r = "keyframes",
        repeat: f = 0,
        repeatDelay: d = 0,
        repeatType: m = "loop",
        keyframes: h,
        name: x,
        motionValue: y,
        element: g,
        ...b
    }) {
        var A;
        super(), this.stop = () => {
            var G, Y;
            this._animation && (this._animation.stop(), (G = this.stopTimeline) == null || G.call(this)), (Y = this.keyframeResolver) == null || Y.cancel()
        }, this.createdAt = ln.now();
        const S = {
                autoplay: i,
                delay: l,
                type: r,
                repeat: f,
                repeatDelay: d,
                repeatType: m,
                name: x,
                motionValue: y,
                element: g,
                ...b
            },
            j = (g == null ? void 0 : g.KeyframeResolver) || If;
        this.keyframeResolver = new j(h, (G, Y, U) => this.onKeyframesResolved(G, Y, S, !U), x, y, g), (A = this.keyframeResolver) == null || A.scheduleResolve()
    }
    onKeyframesResolved(i, l, r, f) {
        var U, I;
        this.keyframeResolver = void 0;
        const {
            name: d,
            type: m,
            velocity: h,
            delay: x,
            isHandoff: y,
            onUpdate: g
        } = r;
        this.resolvedAt = ln.now();
        let b = !0;
        J2(i, d, m, h) || (b = !1, (ai.instantAnimations || !x) && (g == null || g(Ao(i, r, l))), i[0] = i[i.length - 1], jf(r), r.repeat = 0);
        const j = {
                startTime: f ? this.resolvedAt ? this.resolvedAt - this.createdAt > nS ? this.resolvedAt : this.createdAt : this.createdAt : void 0,
                finalKeyframe: l,
                ...r,
                keyframes: i
            },
            A = b && !y && tS(j),
            G = (I = (U = j.motionValue) == null ? void 0 : U.owner) == null ? void 0 : I.current;
        let Y;
        if (A) try {
            Y = new P2({
                ...j,
                element: G
            })
        } catch {
            Y = new vo(j)
        } else Y = new vo(j);
        Y.finished.then(() => {
            this.notifyFinished()
        }).catch(Vn), this.pendingTimeline && (this.stopTimeline = Y.attachTimeline(this.pendingTimeline), this.pendingTimeline = void 0), this._animation = Y
    }
    get finished() {
        return this._animation ? this.animation.finished : this._finished
    }
    then(i, l) {
        return this.finished.finally(i).then(() => {})
    }
    get animation() {
        var i;
        return this._animation || ((i = this.keyframeResolver) == null || i.resume(), G2()), this._animation
    }
    get duration() {
        return this.animation.duration
    }
    get iterationDuration() {
        return this.animation.iterationDuration
    }
    get time() {
        return this.animation.time
    }
    set time(i) {
        this.animation.time = i
    }
    get speed() {
        return this.animation.speed
    }
    get state() {
        return this.animation.state
    }
    set speed(i) {
        this.animation.speed = i
    }
    get startTime() {
        return this.animation.startTime
    }
    attachTimeline(i) {
        return this._animation ? this.stopTimeline = this.animation.attachTimeline(i) : this.pendingTimeline = i, () => this.stop()
    }
    play() {
        this.animation.play()
    }
    pause() {
        this.animation.pause()
    }
    complete() {
        this.animation.complete()
    }
    cancel() {
        var i;
        this._animation && this.animation.cancel(), (i = this.keyframeResolver) == null || i.cancel()
    }
}

function Ay(a, i, l, r = 0, f = 1) {
    const d = Array.from(a).sort((y, g) => y.sortNodePosition(g)).indexOf(i),
        m = a.size,
        h = (m - 1) * r;
    return typeof l == "function" ? l(d, m) : f === 1 ? d * r : h - d * r
}
const iS = /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u;

function sS(a) {
    const i = iS.exec(a);
    if (!i) return [, ];
    const [, l, r, f] = i;
    return [`--${l??r}`, f]
}

function Ey(a, i, l = 1) {
    const [r, f] = sS(a);
    if (!r) return;
    const d = window.getComputedStyle(i).getPropertyValue(r);
    if (d) {
        const m = d.trim();
        return X0(m) ? parseFloat(m) : m
    }
    return Zf(f) ? Ey(f, i, l + 1) : f
}
const lS = {
        type: "spring",
        stiffness: 500,
        damping: 25,
        restSpeed: 10
    },
    rS = a => ({
        type: "spring",
        stiffness: 550,
        damping: a === 0 ? 2 * Math.sqrt(550) : 30,
        restSpeed: 10
    }),
    oS = {
        type: "keyframes",
        duration: .8
    },
    cS = {
        type: "keyframes",
        ease: [.25, .1, .35, 1],
        duration: .3
    },
    uS = (a, {
        keyframes: i
    }) => i.length > 2 ? oS : js.has(a) ? a.startsWith("scale") ? rS(i[1]) : lS : cS;

function Cy(a, i) {
    if (a != null && a.inherit && i) {
        const {
            inherit: l,
            ...r
        } = a;
        return {
            ...i,
            ...r
        }
    }
    return a
}

function Wf(a, i) {
    const l = (a == null ? void 0 : a[i]) ?? (a == null ? void 0 : a.default) ?? a;
    return l !== a ? Cy(l, a) : l
}
const fS = new Set(["when", "delay", "delayChildren", "staggerChildren", "staggerDirection", "repeat", "repeatType", "repeatDelay", "from", "elapsed"]);

function dS(a) {
    for (const i in a)
        if (!fS.has(i)) return !0;
    return !1
}
const ed = (a, i, l, r = {}, f, d) => m => {
    const h = Wf(r, a) || {},
        x = h.delay || r.delay || 0;
    let {
        elapsed: y = 0
    } = r;
    y = y - Tn(x);
    const g = {
        keyframes: Array.isArray(l) ? l : [null, l],
        ease: "easeOut",
        velocity: i.getVelocity(),
        ...h,
        delay: -y,
        onUpdate: S => {
            i.set(S), h.onUpdate && h.onUpdate(S)
        },
        onComplete: () => {
            m(), h.onComplete && h.onComplete()
        },
        name: a,
        motionValue: i,
        element: d ? void 0 : f
    };
    dS(h) || Object.assign(g, uS(a, g)), g.duration && (g.duration = Tn(g.duration)), g.repeatDelay && (g.repeatDelay = Tn(g.repeatDelay)), g.from !== void 0 && (g.keyframes[0] = g.from);
    let b = !1;
    if ((g.type === !1 || g.duration === 0 && !g.repeatDelay) && (jf(g), g.delay === 0 && (b = !0)), (ai.instantAnimations || ai.skipAnimations || f != null && f.shouldSkipAnimations) && (b = !0, jf(g), g.delay = 0), g.allowFlatten = !h.type && !h.ease, b && !d && i.get() !== void 0) {
        const S = Ao(g.keyframes, h);
        if (S !== void 0) {
            lt.update(() => {
                g.onUpdate(S), g.onComplete()
            });
            return
        }
    }
    return h.isSync ? new vo(g) : new aS(g)
};

function jg(a) {
    const i = [{}, {}];
    return a == null || a.values.forEach((l, r) => {
        i[0][r] = l.get(), i[1][r] = l.getVelocity()
    }), i
}

function td(a, i, l, r) {
    if (typeof i == "function") {
        const [f, d] = jg(r);
        i = i(l !== void 0 ? l : a.custom, f, d)
    }
    if (typeof i == "string" && (i = a.variants && a.variants[i]), typeof i == "function") {
        const [f, d] = jg(r);
        i = i(l !== void 0 ? l : a.custom, f, d)
    }
    return i
}

function Li(a, i, l) {
    const r = a.getProps();
    return td(r, i, l !== void 0 ? l : r.custom, a)
}
const Dy = new Set(["width", "height", "top", "left", "right", "bottom", ...Ns]),
    Mg = 30,
    mS = a => !isNaN(parseFloat(a));
class hS {
    constructor(i, l = {}) {
        this.canTrackVelocity = null, this.events = {}, this.updateAndNotify = r => {
            var d;
            const f = ln.now();
            if (this.updatedAt !== f && this.setPrevFrameValue(), this.prev = this.current, this.setCurrent(r), this.current !== this.prev && ((d = this.events.change) == null || d.notify(this.current), this.dependents))
                for (const m of this.dependents) m.dirty()
        }, this.hasAnimated = !1, this.setCurrent(i), this.owner = l.owner
    }
    setCurrent(i) {
        this.current = i, this.updatedAt = ln.now(), this.canTrackVelocity === null && i !== void 0 && (this.canTrackVelocity = mS(this.current))
    }
    setPrevFrameValue(i = this.current) {
        this.prevFrameValue = i, this.prevUpdatedAt = this.updatedAt
    }
    onChange(i) {
        return this.on("change", i)
    }
    on(i, l) {
        this.events[i] || (this.events[i] = new kf);
        const r = this.events[i].add(l);
        return i === "change" ? () => {
            r(), lt.read(() => {
                this.events.change.getSize() || this.stop()
            })
        } : r
    }
    clearListeners() {
        for (const i in this.events) this.events[i].clear()
    }
    attach(i, l) {
        this.passiveEffect = i, this.stopPassiveEffect = l
    }
    set(i) {
        this.passiveEffect ? this.passiveEffect(i, this.updateAndNotify) : this.updateAndNotify(i)
    }
    setWithVelocity(i, l, r) {
        this.set(l), this.prev = void 0, this.prevFrameValue = i, this.prevUpdatedAt = this.updatedAt - r
    }
    jump(i, l = !0) {
        this.updateAndNotify(i), this.prev = i, this.prevUpdatedAt = this.prevFrameValue = void 0, l && this.stop(), this.stopPassiveEffect && this.stopPassiveEffect()
    }
    dirty() {
        var i;
        (i = this.events.change) == null || i.notify(this.current)
    }
    addDependent(i) {
        this.dependents || (this.dependents = new Set), this.dependents.add(i)
    }
    removeDependent(i) {
        this.dependents && this.dependents.delete(i)
    }
    get() {
        return this.current
    }
    getPrevious() {
        return this.prev
    }
    getVelocity() {
        const i = ln.now();
        if (!this.canTrackVelocity || this.prevFrameValue === void 0 || i - this.updatedAt > Mg) return 0;
        const l = Math.min(this.updatedAt - this.prevUpdatedAt, Mg);
        return P0(parseFloat(this.current) - parseFloat(this.prevFrameValue), l)
    }
    start(i) {
        return this.stop(), new Promise(l => {
            this.hasAnimated = !0, this.animation = i(l), this.events.animationStart && this.events.animationStart.notify()
        }).then(() => {
            this.events.animationComplete && this.events.animationComplete.notify(), this.clearAnimation()
        })
    }
    stop() {
        this.animation && (this.animation.stop(), this.events.animationCancel && this.events.animationCancel.notify()), this.clearAnimation()
    }
    isAnimating() {
        return !!this.animation
    }
    clearAnimation() {
        delete this.animation
    }
    destroy() {
        var i, l;
        (i = this.dependents) == null || i.clear(), (l = this.events.destroy) == null || l.notify(), this.clearListeners(), this.stop(), this.stopPassiveEffect && this.stopPassiveEffect()
    }
}

function Ss(a, i) {
    return new hS(a, i)
}
const Mf = a => Array.isArray(a);

function pS(a, i, l) {
    a.hasValue(i) ? a.getValue(i).set(l) : a.addValue(i, Ss(l))
}

function gS(a) {
    return Mf(a) ? a[a.length - 1] || 0 : a
}

function yS(a, i) {
    const l = Li(a, i);
    let {
        transitionEnd: r = {},
        transition: f = {},
        ...d
    } = l || {};
    d = {
        ...d,
        ...r
    };
    for (const m in d) {
        const h = gS(d[m]);
        pS(a, m, h)
    }
}
const en = a => !!(a && a.getVelocity);

function xS(a) {
    return !!(en(a) && a.add)
}

function wf(a, i) {
    const l = a.getValue("willChange");
    if (xS(l)) return l.add(i);
    if (!l && ai.WillChange) {
        const r = new ai.WillChange("auto");
        a.addValue("willChange", r), r.add(i)
    }
}

function nd(a) {
    return a.replace(/([A-Z])/g, i => `-${i.toLowerCase()}`)
}
const vS = "framerAppearId",
    Ry = "data-" + nd(vS);

function Oy(a) {
    return a.props[Ry]
}

function bS({
    protectedKeys: a,
    needsAnimating: i
}, l) {
    const r = a.hasOwnProperty(l) && i[l] !== !0;
    return i[l] = !1, r
}

function zy(a, i, {
    delay: l = 0,
    transitionOverride: r,
    type: f
} = {}) {
    let {
        transition: d,
        transitionEnd: m,
        ...h
    } = i;
    const x = a.getDefaultTransition();
    d = d ? Cy(d, x) : x;
    const y = d == null ? void 0 : d.reduceMotion;
    r && (d = r);
    const g = [],
        b = f && a.animationState && a.animationState.getState()[f];
    for (const S in h) {
        const j = a.getValue(S, a.latestValues[S] ?? null),
            A = h[S];
        if (A === void 0 || b && bS(b, S)) continue;
        const G = {
                delay: l,
                ...Wf(d || {}, S)
            },
            Y = j.get();
        if (Y !== void 0 && !j.isAnimating() && !Array.isArray(A) && A === Y && !G.velocity) {
            lt.update(() => j.set(A));
            continue
        }
        let U = !1;
        if (window.MotionHandoffAnimation) {
            const W = Oy(a);
            if (W) {
                const se = window.MotionHandoffAnimation(W, S, lt);
                se !== null && (G.startTime = se, U = !0)
            }
        }
        wf(a, S);
        const I = y ?? a.shouldReduceMotion;
        j.start(ed(S, j, A, I && Dy.has(S) ? {
            type: !1
        } : G, a, U));
        const P = j.animation;
        P && g.push(P)
    }
    if (m) {
        const S = () => lt.update(() => {
            m && yS(a, m)
        });
        g.length ? Promise.all(g).then(S) : S()
    }
    return g
}

function Af(a, i, l = {}) {
    var x;
    const r = Li(a, i, l.type === "exit" ? (x = a.presenceContext) == null ? void 0 : x.custom : void 0);
    let {
        transition: f = a.getDefaultTransition() || {}
    } = r || {};
    l.transitionOverride && (f = l.transitionOverride);
    const d = r ? () => Promise.all(zy(a, r, l)) : () => Promise.resolve(),
        m = a.variantChildren && a.variantChildren.size ? (y = 0) => {
            const {
                delayChildren: g = 0,
                staggerChildren: b,
                staggerDirection: S
            } = f;
            return SS(a, i, y, g, b, S, l)
        } : () => Promise.resolve(),
        {
            when: h
        } = f;
    if (h) {
        const [y, g] = h === "beforeChildren" ? [d, m] : [m, d];
        return y().then(() => g())
    } else return Promise.all([d(), m(l.delay)])
}

function SS(a, i, l = 0, r = 0, f = 0, d = 1, m) {
    const h = [];
    for (const x of a.variantChildren) x.notify("AnimationStart", i), h.push(Af(x, i, {
        ...m,
        delay: l + (typeof r == "function" ? 0 : r) + Ay(a.variantChildren, x, r, f, d)
    }).then(() => x.notify("AnimationComplete", i)));
    return Promise.all(h)
}

function TS(a, i, l = {}) {
    a.notify("AnimationStart", i);
    let r;
    if (Array.isArray(i)) {
        const f = i.map(d => Af(a, d, l));
        r = Promise.all(f)
    } else if (typeof i == "string") r = Af(a, i, l);
    else {
        const f = typeof i == "function" ? Li(a, i, l.custom) : i;
        r = Promise.all(zy(a, f, l))
    }
    return r.then(() => {
        a.notify("AnimationComplete", i)
    })
}
const NS = {
        test: a => a === "auto",
        parse: a => a
    },
    _y = a => i => i.test(a),
    Ly = [Ts, de, ta, Ia, Fb, Pb, NS],
    wg = a => Ly.find(_y(a));

function jS(a) {
    return typeof a == "number" ? a === 0 : a !== null ? a === "none" || a === "0" || Z0(a) : !0
}
const MS = new Set(["brightness", "contrast", "saturate", "opacity"]);

function wS(a) {
    const [i, l] = a.slice(0, -1).split("(");
    if (i === "drop-shadow") return a;
    const [r] = l.match(Qf) || [];
    if (!r) return a;
    const f = l.replace(r, "");
    let d = MS.has(i) ? 1 : 0;
    return r !== l && (d *= 100), i + "(" + d + f + ")"
}
const AS = /\b([a-z-]*)\(.*?\)/gu,
    Ef = {
        ...Kn,
        getAnimatableNone: a => {
            const i = a.match(AS);
            return i ? i.map(wS).join(" ") : a
        }
    },
    Cf = {
        ...Kn,
        getAnimatableNone: a => {
            const i = Kn.parse(a);
            return Kn.createTransformer(a)(i.map(r => typeof r == "number" ? 0 : typeof r == "object" ? {
                ...r,
                alpha: 1
            } : r))
        }
    },
    Ag = {
        ...Ts,
        transform: Math.round
    },
    ES = {
        rotate: Ia,
        rotateX: Ia,
        rotateY: Ia,
        rotateZ: Ia,
        scale: $r,
        scaleX: $r,
        scaleY: $r,
        scaleZ: $r,
        skew: Ia,
        skewX: Ia,
        skewY: Ia,
        distance: de,
        translateX: de,
        translateY: de,
        translateZ: de,
        x: de,
        y: de,
        z: de,
        perspective: de,
        transformPerspective: de,
        opacity: El,
        originX: mg,
        originY: mg,
        originZ: de
    },
    ad = {
        borderWidth: de,
        borderTopWidth: de,
        borderRightWidth: de,
        borderBottomWidth: de,
        borderLeftWidth: de,
        borderRadius: de,
        borderTopLeftRadius: de,
        borderTopRightRadius: de,
        borderBottomRightRadius: de,
        borderBottomLeftRadius: de,
        width: de,
        maxWidth: de,
        height: de,
        maxHeight: de,
        top: de,
        right: de,
        bottom: de,
        left: de,
        inset: de,
        insetBlock: de,
        insetBlockStart: de,
        insetBlockEnd: de,
        insetInline: de,
        insetInlineStart: de,
        insetInlineEnd: de,
        padding: de,
        paddingTop: de,
        paddingRight: de,
        paddingBottom: de,
        paddingLeft: de,
        paddingBlock: de,
        paddingBlockStart: de,
        paddingBlockEnd: de,
        paddingInline: de,
        paddingInlineStart: de,
        paddingInlineEnd: de,
        margin: de,
        marginTop: de,
        marginRight: de,
        marginBottom: de,
        marginLeft: de,
        marginBlock: de,
        marginBlockStart: de,
        marginBlockEnd: de,
        marginInline: de,
        marginInlineStart: de,
        marginInlineEnd: de,
        fontSize: de,
        backgroundPositionX: de,
        backgroundPositionY: de,
        ...ES,
        zIndex: Ag,
        fillOpacity: El,
        strokeOpacity: El,
        numOctaves: Ag
    },
    CS = {
        ...ad,
        color: Ot,
        backgroundColor: Ot,
        outlineColor: Ot,
        fill: Ot,
        stroke: Ot,
        borderColor: Ot,
        borderTopColor: Ot,
        borderRightColor: Ot,
        borderBottomColor: Ot,
        borderLeftColor: Ot,
        filter: Ef,
        WebkitFilter: Ef,
        mask: Cf,
        WebkitMask: Cf
    },
    Vy = a => CS[a],
    DS = new Set([Ef, Cf]);

function By(a, i) {
    let l = Vy(a);
    return DS.has(l) || (l = Kn), l.getAnimatableNone ? l.getAnimatableNone(i) : void 0
}
const RS = new Set(["auto", "none", "0"]);

function OS(a, i, l) {
    let r = 0,
        f;
    for (; r < a.length && !f;) {
        const d = a[r];
        typeof d == "string" && !RS.has(d) && bs(d).values.length && (f = a[r]), r++
    }
    if (f && l)
        for (const d of i) a[d] = By(l, f)
}
class zS extends If {
    constructor(i, l, r, f, d) {
        super(i, l, r, f, d, !0)
    }
    readKeyframes() {
        const {
            unresolvedKeyframes: i,
            element: l,
            name: r
        } = this;
        if (!l || !l.current) return;
        super.readKeyframes();
        for (let g = 0; g < i.length; g++) {
            let b = i[g];
            if (typeof b == "string" && (b = b.trim(), Zf(b))) {
                const S = Ey(b, l.current);
                S !== void 0 && (i[g] = S), g === i.length - 1 && (this.finalKeyframe = b)
            }
        }
        if (this.resolveNoneKeyframes(), !Dy.has(r) || i.length !== 2) return;
        const [f, d] = i, m = wg(f), h = wg(d), x = dg(f), y = dg(d);
        if (x !== y && ei[r]) {
            this.needsMeasurement = !0;
            return
        }
        if (m !== h)
            if (Sg(m) && Sg(h))
                for (let g = 0; g < i.length; g++) {
                    const b = i[g];
                    typeof b == "string" && (i[g] = parseFloat(b))
                } else ei[r] && (this.needsMeasurement = !0)
    }
    resolveNoneKeyframes() {
        const {
            unresolvedKeyframes: i,
            name: l
        } = this, r = [];
        for (let f = 0; f < i.length; f++)(i[f] === null || jS(i[f])) && r.push(f);
        r.length && OS(i, r, l)
    }
    measureInitialState() {
        const {
            element: i,
            unresolvedKeyframes: l,
            name: r
        } = this;
        if (!i || !i.current) return;
        r === "height" && (this.suspendedScrollY = window.pageYOffset), this.measuredOrigin = ei[r](i.measureViewportBox(), window.getComputedStyle(i.current)), l[0] = this.measuredOrigin;
        const f = l[l.length - 1];
        f !== void 0 && i.getValue(r, f).jump(f, !1)
    }
    measureEndState() {
        var h;
        const {
            element: i,
            name: l,
            unresolvedKeyframes: r
        } = this;
        if (!i || !i.current) return;
        const f = i.getValue(l);
        f && f.jump(this.measuredOrigin, !1);
        const d = r.length - 1,
            m = r[d];
        r[d] = ei[l](i.measureViewportBox(), window.getComputedStyle(i.current)), m !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = m), (h = this.removedTransforms) != null && h.length && this.removedTransforms.forEach(([x, y]) => {
            i.getValue(x).set(y)
        }), this.resolveNoneKeyframes()
    }
}

function Uy(a, i, l) {
    if (a == null) return [];
    if (a instanceof EventTarget) return [a];
    if (typeof a == "string") {
        let r = document;
        const f = (l == null ? void 0 : l[a]) ?? r.querySelectorAll(a);
        return f ? Array.from(f) : []
    }
    return Array.from(a).filter(r => r != null)
}
const Hy = (a, i) => i && typeof a == "number" ? i.transform(a) : a;

function lo(a) {
    return K0(a) && "offsetHeight" in a && !("ownerSVGElement" in a)
}
const {
    schedule: id
} = sy(queueMicrotask, !1), Xn = {
    x: !1,
    y: !1
};

function Gy() {
    return Xn.x || Xn.y
}

function _S(a) {
    return a === "x" || a === "y" ? Xn[a] ? null : (Xn[a] = !0, () => {
        Xn[a] = !1
    }) : Xn.x || Xn.y ? null : (Xn.x = Xn.y = !0, () => {
        Xn.x = Xn.y = !1
    })
}

function Yy(a, i) {
    const l = Uy(a),
        r = new AbortController,
        f = {
            passive: !0,
            ...i,
            signal: r.signal
        };
    return [l, f, () => r.abort()]
}

function LS(a) {
    return !(a.pointerType === "touch" || Gy())
}

function VS(a, i, l = {}) {
    const [r, f, d] = Yy(a, l);
    return r.forEach(m => {
        let h = !1,
            x = !1,
            y;
        const g = () => {
                m.removeEventListener("pointerleave", A)
            },
            b = Y => {
                y && (y(Y), y = void 0), g()
            },
            S = Y => {
                h = !1, window.removeEventListener("pointerup", S), window.removeEventListener("pointercancel", S), x && (x = !1, b(Y))
            },
            j = () => {
                h = !0, window.addEventListener("pointerup", S, f), window.addEventListener("pointercancel", S, f)
            },
            A = Y => {
                if (Y.pointerType !== "touch") {
                    if (h) {
                        x = !0;
                        return
                    }
                    b(Y)
                }
            },
            G = Y => {
                if (!LS(Y)) return;
                x = !1;
                const U = i(m, Y);
                typeof U == "function" && (y = U, m.addEventListener("pointerleave", A, f))
            };
        m.addEventListener("pointerenter", G, f), m.addEventListener("pointerdown", j, f)
    }), d
}
const qy = (a, i) => i ? a === i ? !0 : qy(a, i.parentElement) : !1,
    sd = a => a.pointerType === "mouse" ? typeof a.button != "number" || a.button <= 0 : a.isPrimary !== !1,
    BS = new Set(["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A"]);

function US(a) {
    return BS.has(a.tagName) || a.isContentEditable === !0
}
const HS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

function GS(a) {
    return HS.has(a.tagName) || a.isContentEditable === !0
}
const ro = new WeakSet;

function Eg(a) {
    return i => {
        i.key === "Enter" && a(i)
    }
}

function Ju(a, i) {
    a.dispatchEvent(new PointerEvent("pointer" + i, {
        isPrimary: !0,
        bubbles: !0
    }))
}
const YS = (a, i) => {
    const l = a.currentTarget;
    if (!l) return;
    const r = Eg(() => {
        if (ro.has(l)) return;
        Ju(l, "down");
        const f = Eg(() => {
                Ju(l, "up")
            }),
            d = () => Ju(l, "cancel");
        l.addEventListener("keyup", f, i), l.addEventListener("blur", d, i)
    });
    l.addEventListener("keydown", r, i), l.addEventListener("blur", () => l.removeEventListener("keydown", r), i)
};

function Cg(a) {
    return sd(a) && !Gy()
}
const Dg = new WeakSet;

function qS(a, i, l = {}) {
    const [r, f, d] = Yy(a, l), m = h => {
        const x = h.currentTarget;
        if (!Cg(h) || Dg.has(h)) return;
        ro.add(x), l.stopPropagation && Dg.add(h);
        const y = i(x, h),
            g = (j, A) => {
                window.removeEventListener("pointerup", b), window.removeEventListener("pointercancel", S), ro.has(x) && ro.delete(x), Cg(j) && typeof y == "function" && y(j, {
                    success: A
                })
            },
            b = j => {
                g(j, x === window || x === document || l.useGlobalTarget || qy(x, j.target))
            },
            S = j => {
                g(j, !1)
            };
        window.addEventListener("pointerup", b, f), window.addEventListener("pointercancel", S, f)
    };
    return r.forEach(h => {
        (l.useGlobalTarget ? window : h).addEventListener("pointerdown", m, f), lo(h) && (h.addEventListener("focus", y => YS(y, f)), !US(h) && !h.hasAttribute("tabindex") && (h.tabIndex = 0))
    }), d
}

function ld(a) {
    return K0(a) && "ownerSVGElement" in a
}
const oo = new WeakMap;
let Wa;
const ky = (a, i, l) => (r, f) => f && f[0] ? f[0][a + "Size"] : ld(r) && "getBBox" in r ? r.getBBox()[i] : r[l],
    kS = ky("inline", "width", "offsetWidth"),
    XS = ky("block", "height", "offsetHeight");

function KS({
    target: a,
    borderBoxSize: i
}) {
    var l;
    (l = oo.get(a)) == null || l.forEach(r => {
        r(a, {
            get width() {
                return kS(a, i)
            },
            get height() {
                return XS(a, i)
            }
        })
    })
}

function ZS(a) {
    a.forEach(KS)
}

function QS() {
    typeof ResizeObserver > "u" || (Wa = new ResizeObserver(ZS))
}

function PS(a, i) {
    Wa || QS();
    const l = Uy(a);
    return l.forEach(r => {
        let f = oo.get(r);
        f || (f = new Set, oo.set(r, f)), f.add(i), Wa == null || Wa.observe(r)
    }), () => {
        l.forEach(r => {
            const f = oo.get(r);
            f == null || f.delete(i), f != null && f.size || Wa == null || Wa.unobserve(r)
        })
    }
}
const co = new Set;
let ys;

function FS() {
    ys = () => {
        const a = {
            get width() {
                return window.innerWidth
            },
            get height() {
                return window.innerHeight
            }
        };
        co.forEach(i => i(a))
    }, window.addEventListener("resize", ys)
}

function JS(a) {
    return co.add(a), ys || FS(), () => {
        co.delete(a), !co.size && typeof ys == "function" && (window.removeEventListener("resize", ys), ys = void 0)
    }
}

function Rg(a, i) {
    return typeof a == "function" ? JS(a) : PS(a, i)
}

function $S(a) {
    return ld(a) && a.tagName === "svg"
}
const IS = [...Ly, Ot, Kn],
    WS = a => IS.find(_y(a)),
    Og = () => ({
        translate: 0,
        scale: 1,
        origin: 0,
        originPoint: 0
    }),
    xs = () => ({
        x: Og(),
        y: Og()
    }),
    zg = () => ({
        min: 0,
        max: 0
    }),
    Gt = () => ({
        x: zg(),
        y: zg()
    }),
    eT = new WeakMap;

function Eo(a) {
    return a !== null && typeof a == "object" && typeof a.start == "function"
}

function Cl(a) {
    return typeof a == "string" || Array.isArray(a)
}
const rd = ["animate", "whileInView", "whileFocus", "whileHover", "whileTap", "whileDrag", "exit"],
    od = ["initial", ...rd];

function Co(a) {
    return Eo(a.animate) || od.some(i => Cl(a[i]))
}

function Xy(a) {
    return !!(Co(a) || a.variants)
}

function tT(a, i, l) {
    for (const r in i) {
        const f = i[r],
            d = l[r];
        if (en(f)) a.addValue(r, f);
        else if (en(d)) a.addValue(r, Ss(f, {
            owner: a
        }));
        else if (d !== f)
            if (a.hasValue(r)) {
                const m = a.getValue(r);
                m.liveStyle === !0 ? m.jump(f) : m.hasAnimated || m.set(f)
            } else {
                const m = a.getStaticValue(r);
                a.addValue(r, Ss(m !== void 0 ? m : f, {
                    owner: a
                }))
            }
    }
    for (const r in l) i[r] === void 0 && a.removeValue(r);
    return i
}
const Df = {
        current: null
    },
    Ky = {
        current: !1
    },
    nT = typeof window < "u";

function aT() {
    if (Ky.current = !0, !!nT)
        if (window.matchMedia) {
            const a = window.matchMedia("(prefers-reduced-motion)"),
                i = () => Df.current = a.matches;
            a.addEventListener("change", i), i()
        } else Df.current = !1
}
const _g = ["AnimationStart", "AnimationComplete", "Update", "BeforeLayoutMeasure", "LayoutMeasure", "LayoutAnimationStart", "LayoutAnimationComplete"];
let bo = {};

function Zy(a) {
    bo = a
}

function iT() {
    return bo
}
class sT {
    scrapeMotionValuesFromProps(i, l, r) {
        return {}
    }
    constructor({
        parent: i,
        props: l,
        presenceContext: r,
        reducedMotionConfig: f,
        skipAnimations: d,
        blockInitialAnimation: m,
        visualState: h
    }, x = {}) {
        this.current = null, this.children = new Set, this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = new Map, this.KeyframeResolver = If, this.features = {}, this.valueSubscriptions = new Map, this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
            this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection))
        }, this.renderScheduledAt = 0, this.scheduleRender = () => {
            const j = ln.now();
            this.renderScheduledAt < j && (this.renderScheduledAt = j, lt.render(this.render, !1, !0))
        };
        const {
            latestValues: y,
            renderState: g
        } = h;
        this.latestValues = y, this.baseTarget = {
            ...y
        }, this.initialValues = l.initial ? {
            ...y
        } : {}, this.renderState = g, this.parent = i, this.props = l, this.presenceContext = r, this.depth = i ? i.depth + 1 : 0, this.reducedMotionConfig = f, this.skipAnimationsConfig = d, this.options = x, this.blockInitialAnimation = !!m, this.isControllingVariants = Co(l), this.isVariantNode = Xy(l), this.isVariantNode && (this.variantChildren = new Set), this.manuallyAnimateOnMount = !!(i && i.current);
        const {
            willChange: b,
            ...S
        } = this.scrapeMotionValuesFromProps(l, {}, this);
        for (const j in S) {
            const A = S[j];
            y[j] !== void 0 && en(A) && A.set(y[j])
        }
    }
    mount(i) {
        var l, r;
        if (this.hasBeenMounted)
            for (const f in this.initialValues)(l = this.values.get(f)) == null || l.jump(this.initialValues[f]), this.latestValues[f] = this.initialValues[f];
        this.current = i, eT.set(i, this), this.projection && !this.projection.instance && this.projection.mount(i), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((f, d) => this.bindToMotionValue(d, f)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (Ky.current || aT(), this.shouldReduceMotion = Df.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, (r = this.parent) == null || r.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0
    }
    unmount() {
        var i;
        this.projection && this.projection.unmount(), ii(this.notifyUpdate), ii(this.render), this.valueSubscriptions.forEach(l => l()), this.valueSubscriptions.clear(), this.removeFromVariantTree && this.removeFromVariantTree(), (i = this.parent) == null || i.removeChild(this);
        for (const l in this.events) this.events[l].clear();
        for (const l in this.features) {
            const r = this.features[l];
            r && (r.unmount(), r.isMounted = !1)
        }
        this.current = null
    }
    addChild(i) {
        this.children.add(i), this.enteringChildren ?? (this.enteringChildren = new Set), this.enteringChildren.add(i)
    }
    removeChild(i) {
        this.children.delete(i), this.enteringChildren && this.enteringChildren.delete(i)
    }
    bindToMotionValue(i, l) {
        if (this.valueSubscriptions.has(i) && this.valueSubscriptions.get(i)(), l.accelerate && wy.has(i) && this.current instanceof HTMLElement) {
            const {
                factory: m,
                keyframes: h,
                times: x,
                ease: y,
                duration: g
            } = l.accelerate, b = new jy({
                element: this.current,
                name: i,
                keyframes: h,
                times: x,
                ease: y,
                duration: Tn(g)
            }), S = m(b);
            this.valueSubscriptions.set(i, () => {
                S(), b.cancel()
            });
            return
        }
        const r = js.has(i);
        r && this.onBindTransform && this.onBindTransform();
        const f = l.on("change", m => {
            this.latestValues[i] = m, this.props.onUpdate && lt.preRender(this.notifyUpdate), r && this.projection && (this.projection.isTransformDirty = !0), this.scheduleRender()
        });
        let d;
        typeof window < "u" && window.MotionCheckAppearSync && (d = window.MotionCheckAppearSync(this, i, l)), this.valueSubscriptions.set(i, () => {
            f(), d && d(), l.owner && l.stop()
        })
    }
    sortNodePosition(i) {
        return !this.current || !this.sortInstanceNodePosition || this.type !== i.type ? 0 : this.sortInstanceNodePosition(this.current, i.current)
    }
    updateFeatures() {
        let i = "animation";
        for (i in bo) {
            const l = bo[i];
            if (!l) continue;
            const {
                isEnabled: r,
                Feature: f
            } = l;
            if (!this.features[i] && f && r(this.props) && (this.features[i] = new f(this)), this.features[i]) {
                const d = this.features[i];
                d.isMounted ? d.update() : (d.mount(), d.isMounted = !0)
            }
        }
    }
    triggerBuild() {
        this.build(this.renderState, this.latestValues, this.props)
    }
    measureViewportBox() {
        return this.current ? this.measureInstanceViewportBox(this.current, this.props) : Gt()
    }
    getStaticValue(i) {
        return this.latestValues[i]
    }
    setStaticValue(i, l) {
        this.latestValues[i] = l
    }
    update(i, l) {
        (i.transformTemplate || this.props.transformTemplate) && this.scheduleRender(), this.prevProps = this.props, this.props = i, this.prevPresenceContext = this.presenceContext, this.presenceContext = l;
        for (let r = 0; r < _g.length; r++) {
            const f = _g[r];
            this.propEventSubscriptions[f] && (this.propEventSubscriptions[f](), delete this.propEventSubscriptions[f]);
            const d = "on" + f,
                m = i[d];
            m && (this.propEventSubscriptions[f] = this.on(f, m))
        }
        this.prevMotionValues = tT(this, this.scrapeMotionValuesFromProps(i, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue()
    }
    getProps() {
        return this.props
    }
    getVariant(i) {
        return this.props.variants ? this.props.variants[i] : void 0
    }
    getDefaultTransition() {
        return this.props.transition
    }
    getTransformPagePoint() {
        return this.props.transformPagePoint
    }
    getClosestVariantNode() {
        return this.isVariantNode ? this : this.parent ? this.parent.getClosestVariantNode() : void 0
    }
    addVariantChild(i) {
        const l = this.getClosestVariantNode();
        if (l) return l.variantChildren && l.variantChildren.add(i), () => l.variantChildren.delete(i)
    }
    addValue(i, l) {
        const r = this.values.get(i);
        l !== r && (r && this.removeValue(i), this.bindToMotionValue(i, l), this.values.set(i, l), this.latestValues[i] = l.get())
    }
    removeValue(i) {
        this.values.delete(i);
        const l = this.valueSubscriptions.get(i);
        l && (l(), this.valueSubscriptions.delete(i)), delete this.latestValues[i], this.removeValueFromRenderState(i, this.renderState)
    }
    hasValue(i) {
        return this.values.has(i)
    }
    getValue(i, l) {
        if (this.props.values && this.props.values[i]) return this.props.values[i];
        let r = this.values.get(i);
        return r === void 0 && l !== void 0 && (r = Ss(l === null ? void 0 : l, {
            owner: this
        }), this.addValue(i, r)), r
    }
    readValue(i, l) {
        let r = this.latestValues[i] !== void 0 || !this.current ? this.latestValues[i] : this.getBaseTargetFromProps(this.props, i) ?? this.readValueFromInstance(this.current, i, this.options);
        return r != null && (typeof r == "string" && (X0(r) || Z0(r)) ? r = parseFloat(r) : !WS(r) && Kn.test(l) && (r = By(i, l)), this.setBaseTarget(i, en(r) ? r.get() : r)), en(r) ? r.get() : r
    }
    setBaseTarget(i, l) {
        this.baseTarget[i] = l
    }
    getBaseTarget(i) {
        var d;
        const {
            initial: l
        } = this.props;
        let r;
        if (typeof l == "string" || typeof l == "object") {
            const m = td(this.props, l, (d = this.presenceContext) == null ? void 0 : d.custom);
            m && (r = m[i])
        }
        if (l && r !== void 0) return r;
        const f = this.getBaseTargetFromProps(this.props, i);
        return f !== void 0 && !en(f) ? f : this.initialValues[i] !== void 0 && r === void 0 ? void 0 : this.baseTarget[i]
    }
    on(i, l) {
        return this.events[i] || (this.events[i] = new kf), this.events[i].add(l)
    }
    notify(i, ...l) {
        this.events[i] && this.events[i].notify(...l)
    }
    scheduleRenderMicrotask() {
        id.render(this.render)
    }
}
class Qy extends sT {
    constructor() {
        super(...arguments), this.KeyframeResolver = zS
    }
    sortInstanceNodePosition(i, l) {
        return i.compareDocumentPosition(l) & 2 ? 1 : -1
    }
    getBaseTargetFromProps(i, l) {
        const r = i.style;
        return r ? r[l] : void 0
    }
    removeValueFromRenderState(i, {
        vars: l,
        style: r
    }) {
        delete l[i], delete r[i]
    }
    handleChildMotionValue() {
        this.childSubscription && (this.childSubscription(), delete this.childSubscription);
        const {
            children: i
        } = this.props;
        en(i) && (this.childSubscription = i.on("change", l => {
            this.current && (this.current.textContent = `${l}`)
        }))
    }
}
class si {
    constructor(i) {
        this.isMounted = !1, this.node = i
    }
    update() {}
}

function Py({
    top: a,
    left: i,
    right: l,
    bottom: r
}) {
    return {
        x: {
            min: i,
            max: l
        },
        y: {
            min: a,
            max: r
        }
    }
}

function lT({
    x: a,
    y: i
}) {
    return {
        top: i.min,
        right: a.max,
        bottom: i.max,
        left: a.min
    }
}

function rT(a, i) {
    if (!i) return a;
    const l = i({
            x: a.left,
            y: a.top
        }),
        r = i({
            x: a.right,
            y: a.bottom
        });
    return {
        top: l.y,
        left: l.x,
        bottom: r.y,
        right: r.x
    }
}

function $u(a) {
    return a === void 0 || a === 1
}

function Rf({
    scale: a,
    scaleX: i,
    scaleY: l
}) {
    return !$u(a) || !$u(i) || !$u(l)
}

function Ri(a) {
    return Rf(a) || Fy(a) || a.z || a.rotate || a.rotateX || a.rotateY || a.skewX || a.skewY
}

function Fy(a) {
    return Lg(a.x) || Lg(a.y)
}

function Lg(a) {
    return a && a !== "0%"
}

function So(a, i, l) {
    const r = a - l,
        f = i * r;
    return l + f
}

function Vg(a, i, l, r, f) {
    return f !== void 0 && (a = So(a, f, r)), So(a, l, r) + i
}

function Of(a, i = 0, l = 1, r, f) {
    a.min = Vg(a.min, i, l, r, f), a.max = Vg(a.max, i, l, r, f)
}

function Jy(a, {
    x: i,
    y: l
}) {
    Of(a.x, i.translate, i.scale, i.originPoint), Of(a.y, l.translate, l.scale, l.originPoint)
}
const Bg = .999999999999,
    Ug = 1.0000000000001;

function oT(a, i, l, r = !1) {
    var h;
    const f = l.length;
    if (!f) return;
    i.x = i.y = 1;
    let d, m;
    for (let x = 0; x < f; x++) {
        d = l[x], m = d.projectionDelta;
        const {
            visualElement: y
        } = d.options;
        y && y.props.style && y.props.style.display === "contents" || (r && d.options.layoutScroll && d.scroll && d !== d.root && (ea(a.x, -d.scroll.offset.x), ea(a.y, -d.scroll.offset.y)), m && (i.x *= m.x.scale, i.y *= m.y.scale, Jy(a, m)), r && Ri(d.latestValues) && uo(a, d.latestValues, (h = d.layout) == null ? void 0 : h.layoutBox))
    }
    i.x < Ug && i.x > Bg && (i.x = 1), i.y < Ug && i.y > Bg && (i.y = 1)
}

function ea(a, i) {
    a.min += i, a.max += i
}

function Hg(a, i, l, r, f = .5) {
    const d = ft(a.min, a.max, f);
    Of(a, i, l, d, r)
}

function Gg(a, i) {
    return typeof a == "string" ? parseFloat(a) / 100 * (i.max - i.min) : a
}

function uo(a, i, l) {
    const r = l ?? a;
    Hg(a.x, Gg(i.x, r.x), i.scaleX, i.scale, i.originX), Hg(a.y, Gg(i.y, r.y), i.scaleY, i.scale, i.originY)
}

function $y(a, i) {
    return Py(rT(a.getBoundingClientRect(), i))
}

function cT(a, i, l) {
    const r = $y(a, l),
        {
            scroll: f
        } = i;
    return f && (ea(r.x, f.offset.x), ea(r.y, f.offset.y)), r
}
const uT = {
        x: "translateX",
        y: "translateY",
        z: "translateZ",
        transformPerspective: "perspective"
    },
    fT = Ns.length;

function dT(a, i, l) {
    let r = "",
        f = !0;
    for (let d = 0; d < fT; d++) {
        const m = Ns[d],
            h = a[m];
        if (h === void 0) continue;
        let x = !0;
        if (typeof h == "number") x = h === (m.startsWith("scale") ? 1 : 0);
        else {
            const y = parseFloat(h);
            x = m.startsWith("scale") ? y === 1 : y === 0
        }
        if (!x || l) {
            const y = Hy(h, ad[m]);
            if (!x) {
                f = !1;
                const g = uT[m] || m;
                r += `${g}(${y}) `
            }
            l && (i[m] = y)
        }
    }
    return r = r.trim(), l ? r = l(i, f ? "" : r) : f && (r = "none"), r
}

function cd(a, i, l) {
    const {
        style: r,
        vars: f,
        transformOrigin: d
    } = a;
    let m = !1,
        h = !1;
    for (const x in i) {
        const y = i[x];
        if (js.has(x)) {
            m = !0;
            continue
        } else if (ry(x)) {
            f[x] = y;
            continue
        } else {
            const g = Hy(y, ad[x]);
            x.startsWith("origin") ? (h = !0, d[x] = g) : r[x] = g
        }
    }
    if (i.transform || (m || l ? r.transform = dT(i, a.transform, l) : r.transform && (r.transform = "none")), h) {
        const {
            originX: x = "50%",
            originY: y = "50%",
            originZ: g = 0
        } = d;
        r.transformOrigin = `${x} ${y} ${g}`
    }
}

function Iy(a, {
    style: i,
    vars: l
}, r, f) {
    const d = a.style;
    let m;
    for (m in i) d[m] = i[m];
    f == null || f.applyProjectionStyles(d, r);
    for (m in l) d.setProperty(m, l[m])
}

function Yg(a, i) {
    return i.max === i.min ? 0 : a / (i.max - i.min) * 100
}
const gl = {
        correct: (a, i) => {
            if (!i.target) return a;
            if (typeof a == "string")
                if (de.test(a)) a = parseFloat(a);
                else return a;
            const l = Yg(a, i.target.x),
                r = Yg(a, i.target.y);
            return `${l}% ${r}%`
        }
    },
    mT = {
        correct: (a, {
            treeScale: i,
            projectionDelta: l
        }) => {
            const r = a,
                f = Kn.parse(a);
            if (f.length > 5) return r;
            const d = Kn.createTransformer(a),
                m = typeof f[0] != "number" ? 1 : 0,
                h = l.x.scale * i.x,
                x = l.y.scale * i.y;
            f[0 + m] /= h, f[1 + m] /= x;
            const y = ft(h, x, .5);
            return typeof f[2 + m] == "number" && (f[2 + m] /= y), typeof f[3 + m] == "number" && (f[3 + m] /= y), d(f)
        }
    },
    zf = {
        borderRadius: {
            ...gl,
            applyTo: ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"]
        },
        borderTopLeftRadius: gl,
        borderTopRightRadius: gl,
        borderBottomLeftRadius: gl,
        borderBottomRightRadius: gl,
        boxShadow: mT
    };

function Wy(a, {
    layout: i,
    layoutId: l
}) {
    return js.has(a) || a.startsWith("origin") || (i || l !== void 0) && (!!zf[a] || a === "opacity")
}

function ud(a, i, l) {
    var m;
    const r = a.style,
        f = i == null ? void 0 : i.style,
        d = {};
    if (!r) return d;
    for (const h in r)(en(r[h]) || f && en(f[h]) || Wy(h, a) || ((m = l == null ? void 0 : l.getValue(h)) == null ? void 0 : m.liveStyle) !== void 0) && (d[h] = r[h]);
    return d
}

function hT(a) {
    return window.getComputedStyle(a)
}
class pT extends Qy {
    constructor() {
        super(...arguments), this.type = "html", this.renderInstance = Iy
    }
    readValueFromInstance(i, l) {
        var r;
        if (js.has(l)) return (r = this.projection) != null && r.isProjecting ? vf(l) : L2(i, l);
        {
            const f = hT(i),
                d = (ry(l) ? f.getPropertyValue(l) : f[l]) || 0;
            return typeof d == "string" ? d.trim() : d
        }
    }
    measureInstanceViewportBox(i, {
        transformPagePoint: l
    }) {
        return $y(i, l)
    }
    build(i, l, r) {
        cd(i, l, r.transformTemplate)
    }
    scrapeMotionValuesFromProps(i, l, r) {
        return ud(i, l, r)
    }
}
const gT = {
        offset: "stroke-dashoffset",
        array: "stroke-dasharray"
    },
    yT = {
        offset: "strokeDashoffset",
        array: "strokeDasharray"
    };

function xT(a, i, l = 1, r = 0, f = !0) {
    a.pathLength = 1;
    const d = f ? gT : yT;
    a[d.offset] = `${-r}`, a[d.array] = `${i} ${l}`
}
const vT = ["offsetDistance", "offsetPath", "offsetRotate", "offsetAnchor"];

function ex(a, {
    attrX: i,
    attrY: l,
    attrScale: r,
    pathLength: f,
    pathSpacing: d = 1,
    pathOffset: m = 0,
    ...h
}, x, y, g) {
    if (cd(a, h, y), x) {
        a.style.viewBox && (a.attrs.viewBox = a.style.viewBox);
        return
    }
    a.attrs = a.style, a.style = {};
    const {
        attrs: b,
        style: S
    } = a;
    b.transform && (S.transform = b.transform, delete b.transform), (S.transform || b.transformOrigin) && (S.transformOrigin = b.transformOrigin ?? "50% 50%", delete b.transformOrigin), S.transform && (S.transformBox = (g == null ? void 0 : g.transformBox) ?? "fill-box", delete b.transformBox);
    for (const j of vT) b[j] !== void 0 && (S[j] = b[j], delete b[j]);
    i !== void 0 && (b.x = i), l !== void 0 && (b.y = l), r !== void 0 && (b.scale = r), f !== void 0 && xT(b, f, d, m, !1)
}
const tx = new Set(["baseFrequency", "diffuseConstant", "kernelMatrix", "kernelUnitLength", "keySplines", "keyTimes", "limitingConeAngle", "markerHeight", "markerWidth", "numOctaves", "targetX", "targetY", "surfaceScale", "specularConstant", "specularExponent", "stdDeviation", "tableValues", "viewBox", "gradientTransform", "pathLength", "startOffset", "textLength", "lengthAdjust"]),
    nx = a => typeof a == "string" && a.toLowerCase() === "svg";

function bT(a, i, l, r) {
    Iy(a, i, void 0, r);
    for (const f in i.attrs) a.setAttribute(tx.has(f) ? f : nd(f), i.attrs[f])
}

function ax(a, i, l) {
    const r = ud(a, i, l);
    for (const f in a)
        if (en(a[f]) || en(i[f])) {
            const d = Ns.indexOf(f) !== -1 ? "attr" + f.charAt(0).toUpperCase() + f.substring(1) : f;
            r[d] = a[f]
        } return r
}
class ST extends Qy {
    constructor() {
        super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = Gt
    }
    getBaseTargetFromProps(i, l) {
        return i[l]
    }
    readValueFromInstance(i, l) {
        if (js.has(l)) {
            const r = Vy(l);
            return r && r.default || 0
        }
        return l = tx.has(l) ? l : nd(l), i.getAttribute(l)
    }
    scrapeMotionValuesFromProps(i, l, r) {
        return ax(i, l, r)
    }
    build(i, l, r) {
        ex(i, l, this.isSVGTag, r.transformTemplate, r.style)
    }
    renderInstance(i, l, r, f) {
        bT(i, l, r, f)
    }
    mount(i) {
        this.isSVGTag = nx(i.tagName), super.mount(i)
    }
}
const TT = od.length;

function ix(a) {
    if (!a) return;
    if (!a.isControllingVariants) {
        const l = a.parent ? ix(a.parent) || {} : {};
        return a.props.initial !== void 0 && (l.initial = a.props.initial), l
    }
    const i = {};
    for (let l = 0; l < TT; l++) {
        const r = od[l],
            f = a.props[r];
        (Cl(f) || f === !1) && (i[r] = f)
    }
    return i
}

function sx(a, i) {
    if (!Array.isArray(i)) return !1;
    const l = i.length;
    if (l !== a.length) return !1;
    for (let r = 0; r < l; r++)
        if (i[r] !== a[r]) return !1;
    return !0
}
const NT = [...rd].reverse(),
    jT = rd.length;

function MT(a) {
    return i => Promise.all(i.map(({
        animation: l,
        options: r
    }) => TS(a, l, r)))
}

function wT(a) {
    let i = MT(a),
        l = qg(),
        r = !0,
        f = !1;
    const d = y => (g, b) => {
        var j;
        const S = Li(a, b, y === "exit" ? (j = a.presenceContext) == null ? void 0 : j.custom : void 0);
        if (S) {
            const {
                transition: A,
                transitionEnd: G,
                ...Y
            } = S;
            g = {
                ...g,
                ...Y,
                ...G
            }
        }
        return g
    };

    function m(y) {
        i = y(a)
    }

    function h(y) {
        const {
            props: g
        } = a, b = ix(a.parent) || {}, S = [], j = new Set;
        let A = {},
            G = 1 / 0;
        for (let U = 0; U < jT; U++) {
            const I = NT[U],
                P = l[I],
                W = g[I] !== void 0 ? g[I] : b[I],
                se = Cl(W),
                he = I === y ? P.isActive : null;
            he === !1 && (G = U);
            let $ = W === b[I] && W !== g[I] && se;
            if ($ && (r || f) && a.manuallyAnimateOnMount && ($ = !1), P.protectedKeys = {
                    ...A
                }, !P.isActive && he === null || !W && !P.prevProp || Eo(W) || typeof W == "boolean") continue;
            if (I === "exit" && P.isActive && he !== !0) {
                P.prevResolvedValues && (A = {
                    ...A,
                    ...P.prevResolvedValues
                });
                continue
            }
            const ne = AT(P.prevProp, W);
            let ce = ne || I === y && P.isActive && !$ && se || U > G && se,
                te = !1;
            const Me = Array.isArray(W) ? W : [W];
            let Se = Me.reduce(d(I), {});
            he === !1 && (Se = {});
            const {
                prevResolvedValues: Fe = {}
            } = P, ze = {
                ...Fe,
                ...Se
            }, Ae = ae => {
                ce = !0, j.has(ae) && (te = !0, j.delete(ae)), P.needsAnimating[ae] = !0;
                const ge = a.getValue(ae);
                ge && (ge.liveStyle = !1)
            };
            for (const ae in ze) {
                const ge = Se[ae],
                    Ne = Fe[ae];
                if (A.hasOwnProperty(ae)) continue;
                let T = !1;
                Mf(ge) && Mf(Ne) ? T = !sx(ge, Ne) : T = ge !== Ne, T ? ge != null ? Ae(ae) : j.add(ae) : ge !== void 0 && j.has(ae) ? Ae(ae) : P.protectedKeys[ae] = !0
            }
            P.prevProp = W, P.prevResolvedValues = Se, P.isActive && (A = {
                ...A,
                ...Se
            }), (r || f) && a.blockInitialAnimation && (ce = !1);
            const O = $ && ne;
            ce && (!O || te) && S.push(...Me.map(ae => {
                const ge = {
                    type: I
                };
                if (typeof ae == "string" && (r || f) && !O && a.manuallyAnimateOnMount && a.parent) {
                    const {
                        parent: Ne
                    } = a, T = Li(Ne, ae);
                    if (Ne.enteringChildren && T) {
                        const {
                            delayChildren: X
                        } = T.transition || {};
                        ge.delay = Ay(Ne.enteringChildren, a, X)
                    }
                }
                return {
                    animation: ae,
                    options: ge
                }
            }))
        }
        if (j.size) {
            const U = {};
            if (typeof g.initial != "boolean") {
                const I = Li(a, Array.isArray(g.initial) ? g.initial[0] : g.initial);
                I && I.transition && (U.transition = I.transition)
            }
            j.forEach(I => {
                const P = a.getBaseTarget(I),
                    W = a.getValue(I);
                W && (W.liveStyle = !0), U[I] = P ?? null
            }), S.push({
                animation: U
            })
        }
        let Y = !!S.length;
        return r && (g.initial === !1 || g.initial === g.animate) && !a.manuallyAnimateOnMount && (Y = !1), r = !1, f = !1, Y ? i(S) : Promise.resolve()
    }

    function x(y, g) {
        var S;
        if (l[y].isActive === g) return Promise.resolve();
        (S = a.variantChildren) == null || S.forEach(j => {
            var A;
            return (A = j.animationState) == null ? void 0 : A.setActive(y, g)
        }), l[y].isActive = g;
        const b = h(y);
        for (const j in l) l[j].protectedKeys = {};
        return b
    }
    return {
        animateChanges: h,
        setActive: x,
        setAnimateFunction: m,
        getState: () => l,
        reset: () => {
            l = qg(), f = !0
        }
    }
}

function AT(a, i) {
    return typeof i == "string" ? i !== a : Array.isArray(i) ? !sx(i, a) : !1
}

function Di(a = !1) {
    return {
        isActive: a,
        protectedKeys: {},
        needsAnimating: {},
        prevResolvedValues: {}
    }
}

function qg() {
    return {
        animate: Di(!0),
        whileInView: Di(),
        whileHover: Di(),
        whileTap: Di(),
        whileDrag: Di(),
        whileFocus: Di(),
        exit: Di()
    }
}

function _f(a, i) {
    a.min = i.min, a.max = i.max
}

function kn(a, i) {
    _f(a.x, i.x), _f(a.y, i.y)
}

function kg(a, i) {
    a.translate = i.translate, a.scale = i.scale, a.originPoint = i.originPoint, a.origin = i.origin
}
const lx = 1e-4,
    ET = 1 - lx,
    CT = 1 + lx,
    rx = .01,
    DT = 0 - rx,
    RT = 0 + rx;

function rn(a) {
    return a.max - a.min
}

function OT(a, i, l) {
    return Math.abs(a - i) <= l
}

function Xg(a, i, l, r = .5) {
    a.origin = r, a.originPoint = ft(i.min, i.max, a.origin), a.scale = rn(l) / rn(i), a.translate = ft(l.min, l.max, a.origin) - a.originPoint, (a.scale >= ET && a.scale <= CT || isNaN(a.scale)) && (a.scale = 1), (a.translate >= DT && a.translate <= RT || isNaN(a.translate)) && (a.translate = 0)
}

function Ml(a, i, l, r) {
    Xg(a.x, i.x, l.x, r ? r.originX : void 0), Xg(a.y, i.y, l.y, r ? r.originY : void 0)
}

function Kg(a, i, l, r = 0) {
    const f = r ? ft(l.min, l.max, r) : l.min;
    a.min = f + i.min, a.max = a.min + rn(i)
}

function zT(a, i, l, r) {
    Kg(a.x, i.x, l.x, r == null ? void 0 : r.x), Kg(a.y, i.y, l.y, r == null ? void 0 : r.y)
}

function Zg(a, i, l, r = 0) {
    const f = r ? ft(l.min, l.max, r) : l.min;
    a.min = i.min - f, a.max = a.min + rn(i)
}

function To(a, i, l, r) {
    Zg(a.x, i.x, l.x, r == null ? void 0 : r.x), Zg(a.y, i.y, l.y, r == null ? void 0 : r.y)
}

function Qg(a, i, l, r, f) {
    return a -= i, a = So(a, 1 / l, r), f !== void 0 && (a = So(a, 1 / f, r)), a
}

function _T(a, i = 0, l = 1, r = .5, f, d = a, m = a) {
    if (ta.test(i) && (i = parseFloat(i), i = ft(m.min, m.max, i / 100) - m.min), typeof i != "number") return;
    let h = ft(d.min, d.max, r);
    a === d && (h -= i), a.min = Qg(a.min, i, l, h, f), a.max = Qg(a.max, i, l, h, f)
}

function Pg(a, i, [l, r, f], d, m) {
    _T(a, i[l], i[r], i[f], i.scale, d, m)
}
const LT = ["x", "scaleX", "originX"],
    VT = ["y", "scaleY", "originY"];

function Fg(a, i, l, r) {
    Pg(a.x, i, LT, l ? l.x : void 0, r ? r.x : void 0), Pg(a.y, i, VT, l ? l.y : void 0, r ? r.y : void 0)
}

function Jg(a) {
    return a.translate === 0 && a.scale === 1
}

function ox(a) {
    return Jg(a.x) && Jg(a.y)
}

function $g(a, i) {
    return a.min === i.min && a.max === i.max
}

function BT(a, i) {
    return $g(a.x, i.x) && $g(a.y, i.y)
}

function Ig(a, i) {
    return Math.round(a.min) === Math.round(i.min) && Math.round(a.max) === Math.round(i.max)
}

function cx(a, i) {
    return Ig(a.x, i.x) && Ig(a.y, i.y)
}

function Wg(a) {
    return rn(a.x) / rn(a.y)
}

function e0(a, i) {
    return a.translate === i.translate && a.scale === i.scale && a.originPoint === i.originPoint
}

function Wn(a) {
    return [a("x"), a("y")]
}

function UT(a, i, l) {
    let r = "";
    const f = a.x.translate / i.x,
        d = a.y.translate / i.y,
        m = (l == null ? void 0 : l.z) || 0;
    if ((f || d || m) && (r = `translate3d(${f}px, ${d}px, ${m}px) `), (i.x !== 1 || i.y !== 1) && (r += `scale(${1/i.x}, ${1/i.y}) `), l) {
        const {
            transformPerspective: y,
            rotate: g,
            rotateX: b,
            rotateY: S,
            skewX: j,
            skewY: A
        } = l;
        y && (r = `perspective(${y}px) ${r}`), g && (r += `rotate(${g}deg) `), b && (r += `rotateX(${b}deg) `), S && (r += `rotateY(${S}deg) `), j && (r += `skewX(${j}deg) `), A && (r += `skewY(${A}deg) `)
    }
    const h = a.x.scale * i.x,
        x = a.y.scale * i.y;
    return (h !== 1 || x !== 1) && (r += `scale(${h}, ${x})`), r || "none"
}
const ux = ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"],
    HT = ux.length,
    t0 = a => typeof a == "string" ? parseFloat(a) : a,
    n0 = a => typeof a == "number" || de.test(a);

function GT(a, i, l, r, f, d) {
    f ? (a.opacity = ft(0, l.opacity ?? 1, YT(r)), a.opacityExit = ft(i.opacity ?? 1, 0, qT(r))) : d && (a.opacity = ft(i.opacity ?? 1, l.opacity ?? 1, r));
    for (let m = 0; m < HT; m++) {
        const h = ux[m];
        let x = a0(i, h),
            y = a0(l, h);
        if (x === void 0 && y === void 0) continue;
        x || (x = 0), y || (y = 0), x === 0 || y === 0 || n0(x) === n0(y) ? (a[h] = Math.max(ft(t0(x), t0(y), r), 0), (ta.test(y) || ta.test(x)) && (a[h] += "%")) : a[h] = y
    }(i.rotate || l.rotate) && (a.rotate = ft(i.rotate || 0, l.rotate || 0, r))
}

function a0(a, i) {
    return a[i] !== void 0 ? a[i] : a.borderRadius
}
const YT = fx(0, .5, ty),
    qT = fx(.5, .95, Vn);

function fx(a, i, l) {
    return r => r < a ? 0 : r > i ? 1 : l(Al(a, i, r))
}

function kT(a, i, l) {
    const r = en(a) ? a : Ss(a);
    return r.start(ed("", r, i, l)), r.animation
}

function Dl(a, i, l, r = {
    passive: !0
}) {
    return a.addEventListener(i, l, r), () => a.removeEventListener(i, l)
}
const XT = (a, i) => a.depth - i.depth;
class KT {
    constructor() {
        this.children = [], this.isDirty = !1
    }
    add(i) {
        Yf(this.children, i), this.isDirty = !0
    }
    remove(i) {
        po(this.children, i), this.isDirty = !0
    }
    forEach(i) {
        this.isDirty && this.children.sort(XT), this.isDirty = !1, this.children.forEach(i)
    }
}

function ZT(a, i) {
    const l = ln.now(),
        r = ({
            timestamp: f
        }) => {
            const d = f - l;
            d >= i && (ii(r), a(d - i))
        };
    return lt.setup(r, !0), () => ii(r)
}

function fo(a) {
    return en(a) ? a.get() : a
}
class QT {
    constructor() {
        this.members = []
    }
    add(i) {
        Yf(this.members, i);
        for (let l = this.members.length - 1; l >= 0; l--) {
            const r = this.members[l];
            if (r === i || r === this.lead || r === this.prevLead) continue;
            const f = r.instance;
            (!f || f.isConnected === !1) && !r.snapshot && (po(this.members, r), r.unmount())
        }
        i.scheduleRender()
    }
    remove(i) {
        if (po(this.members, i), i === this.prevLead && (this.prevLead = void 0), i === this.lead) {
            const l = this.members[this.members.length - 1];
            l && this.promote(l)
        }
    }
    relegate(i) {
        var l;
        for (let r = this.members.indexOf(i) - 1; r >= 0; r--) {
            const f = this.members[r];
            if (f.isPresent !== !1 && ((l = f.instance) == null ? void 0 : l.isConnected) !== !1) return this.promote(f), !0
        }
        return !1
    }
    promote(i, l) {
        var f;
        const r = this.lead;
        if (i !== r && (this.prevLead = r, this.lead = i, i.show(), r)) {
            r.updateSnapshot(), i.scheduleRender();
            const {
                layoutDependency: d
            } = r.options, {
                layoutDependency: m
            } = i.options;
            (d === void 0 || d !== m) && (i.resumeFrom = r, l && (r.preserveOpacity = !0), r.snapshot && (i.snapshot = r.snapshot, i.snapshot.latestValues = r.animationValues || r.latestValues), (f = i.root) != null && f.isUpdating && (i.isLayoutDirty = !0)), i.options.crossfade === !1 && r.hide()
        }
    }
    exitAnimationComplete() {
        this.members.forEach(i => {
            var l, r, f, d, m;
            (r = (l = i.options).onExitComplete) == null || r.call(l), (m = (f = i.resumingFrom) == null ? void 0 : (d = f.options).onExitComplete) == null || m.call(d)
        })
    }
    scheduleRender() {
        this.members.forEach(i => i.instance && i.scheduleRender(!1))
    }
    removeLeadSnapshot() {
        var i;
        (i = this.lead) != null && i.snapshot && (this.lead.snapshot = void 0)
    }
}
const mo = {
        hasAnimatedSinceResize: !0,
        hasEverUpdated: !1
    },
    Iu = ["", "X", "Y", "Z"],
    PT = 1e3;
let FT = 0;

function Wu(a, i, l, r) {
    const {
        latestValues: f
    } = i;
    f[a] && (l[a] = f[a], i.setStaticValue(a, 0), r && (r[a] = 0))
}

function dx(a) {
    if (a.hasCheckedOptimisedAppear = !0, a.root === a) return;
    const {
        visualElement: i
    } = a.options;
    if (!i) return;
    const l = Oy(i);
    if (window.MotionHasOptimisedAnimation(l, "transform")) {
        const {
            layout: f,
            layoutId: d
        } = a.options;
        window.MotionCancelOptimisedAnimation(l, "transform", lt, !(f || d))
    }
    const {
        parent: r
    } = a;
    r && !r.hasCheckedOptimisedAppear && dx(r)
}

function mx({
    attachResizeListener: a,
    defaultParent: i,
    measureScroll: l,
    checkIsScrollRoot: r,
    resetTransform: f
}) {
    return class {
        constructor(m = {}, h = i == null ? void 0 : i()) {
            this.id = FT++, this.animationId = 0, this.animationCommitId = 0, this.children = new Set, this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = {
                x: 1,
                y: 1
            }, this.eventHandlers = new Map, this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
                this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots())
            }, this.updateProjection = () => {
                this.projectionUpdateScheduled = !1, this.nodes.forEach(IT), this.nodes.forEach(iN), this.nodes.forEach(sN), this.nodes.forEach(WT)
            }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = new Map, this.latestValues = m, this.root = h ? h.root || h : this, this.path = h ? [...h.path, h] : [], this.parent = h, this.depth = h ? h.depth + 1 : 0;
            for (let x = 0; x < this.path.length; x++) this.path[x].shouldResetTransform = !0;
            this.root === this && (this.nodes = new KT)
        }
        addEventListener(m, h) {
            return this.eventHandlers.has(m) || this.eventHandlers.set(m, new kf), this.eventHandlers.get(m).add(h)
        }
        notifyListeners(m, ...h) {
            const x = this.eventHandlers.get(m);
            x && x.notify(...h)
        }
        hasListeners(m) {
            return this.eventHandlers.has(m)
        }
        mount(m) {
            if (this.instance) return;
            this.isSVG = ld(m) && !$S(m), this.instance = m;
            const {
                layoutId: h,
                layout: x,
                visualElement: y
            } = this.options;
            if (y && !y.current && y.mount(m), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (x || h) && (this.isLayoutDirty = !0), a) {
                let g, b = 0;
                const S = () => this.root.updateBlockedByResize = !1;
                lt.read(() => {
                    b = window.innerWidth
                }), a(m, () => {
                    const j = window.innerWidth;
                    j !== b && (b = j, this.root.updateBlockedByResize = !0, g && g(), g = ZT(S, 250), mo.hasAnimatedSinceResize && (mo.hasAnimatedSinceResize = !1, this.nodes.forEach(l0)))
                })
            }
            h && this.root.registerSharedNode(h, this), this.options.animate !== !1 && y && (h || x) && this.addEventListener("didUpdate", ({
                delta: g,
                hasLayoutChanged: b,
                hasRelativeLayoutChanged: S,
                layout: j
            }) => {
                if (this.isTreeAnimationBlocked()) {
                    this.target = void 0, this.relativeTarget = void 0;
                    return
                }
                const A = this.options.transition || y.getDefaultTransition() || uN,
                    {
                        onLayoutAnimationStart: G,
                        onLayoutAnimationComplete: Y
                    } = y.getProps(),
                    U = !this.targetLayout || !cx(this.targetLayout, j),
                    I = !b && S;
                if (this.options.layoutRoot || this.resumeFrom || I || b && (U || !this.currentAnimation)) {
                    this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
                    const P = {
                        ...Wf(A, "layout"),
                        onPlay: G,
                        onComplete: Y
                    };
                    (y.shouldReduceMotion || this.options.layoutRoot) && (P.delay = 0, P.type = !1), this.startAnimation(P), this.setAnimationOrigin(g, I)
                } else b || l0(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
                this.targetLayout = j
            })
        }
        unmount() {
            this.options.layoutId && this.willUpdate(), this.root.nodes.remove(this);
            const m = this.getStack();
            m && m.remove(this), this.parent && this.parent.children.delete(this), this.instance = void 0, this.eventHandlers.clear(), ii(this.updateProjection)
        }
        blockUpdate() {
            this.updateManuallyBlocked = !0
        }
        unblockUpdate() {
            this.updateManuallyBlocked = !1
        }
        isUpdateBlocked() {
            return this.updateManuallyBlocked || this.updateBlockedByResize
        }
        isTreeAnimationBlocked() {
            return this.isAnimationBlocked || this.parent && this.parent.isTreeAnimationBlocked() || !1
        }
        startUpdate() {
            this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(lN), this.animationId++)
        }
        getTransformTemplate() {
            const {
                visualElement: m
            } = this.options;
            return m && m.getProps().transformTemplate
        }
        willUpdate(m = !0) {
            if (this.root.hasTreeAnimated = !0, this.root.isUpdateBlocked()) {
                this.options.onExitComplete && this.options.onExitComplete();
                return
            }
            if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && dx(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty) return;
            this.isLayoutDirty = !0;
            for (let g = 0; g < this.path.length; g++) {
                const b = this.path[g];
                b.shouldResetTransform = !0, (typeof b.latestValues.x == "string" || typeof b.latestValues.y == "string") && (b.isLayoutDirty = !0), b.updateScroll("snapshot"), b.options.layoutRoot && b.willUpdate(!1)
            }
            const {
                layoutId: h,
                layout: x
            } = this.options;
            if (h === void 0 && !x) return;
            const y = this.getTransformTemplate();
            this.prevTransformTemplateValue = y ? y(this.latestValues, "") : void 0, this.updateSnapshot(), m && this.notifyListeners("willUpdate")
        }
        update() {
            if (this.updateScheduled = !1, this.isUpdateBlocked()) {
                const x = this.updateBlockedByResize;
                this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), x && this.nodes.forEach(tN), this.nodes.forEach(i0);
                return
            }
            if (this.animationId <= this.animationCommitId) {
                this.nodes.forEach(s0);
                return
            }
            this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach(nN), this.nodes.forEach(aN), this.nodes.forEach(JT), this.nodes.forEach($T)) : this.nodes.forEach(s0), this.clearAllSnapshots();
            const h = ln.now();
            Wt.delta = na(0, 1e3 / 60, h - Wt.timestamp), Wt.timestamp = h, Wt.isProcessing = !0, Xu.update.process(Wt), Xu.preRender.process(Wt), Xu.render.process(Wt), Wt.isProcessing = !1
        }
        didUpdate() {
            this.updateScheduled || (this.updateScheduled = !0, id.read(this.scheduleUpdate))
        }
        clearAllSnapshots() {
            this.nodes.forEach(eN), this.sharedNodes.forEach(rN)
        }
        scheduleUpdateProjection() {
            this.projectionUpdateScheduled || (this.projectionUpdateScheduled = !0, lt.preRender(this.updateProjection, !1, !0))
        }
        scheduleCheckAfterUnmount() {
            lt.postRender(() => {
                this.isLayoutDirty ? this.root.didUpdate() : this.root.checkUpdateFailed()
            })
        }
        updateSnapshot() {
            this.snapshot || !this.instance || (this.snapshot = this.measure(), this.snapshot && !rn(this.snapshot.measuredBox.x) && !rn(this.snapshot.measuredBox.y) && (this.snapshot = void 0))
        }
        updateLayout() {
            if (!this.instance || (this.updateScroll(), !(this.options.alwaysMeasureLayout && this.isLead()) && !this.isLayoutDirty)) return;
            if (this.resumeFrom && !this.resumeFrom.instance)
                for (let x = 0; x < this.path.length; x++) this.path[x].updateScroll();
            const m = this.layout;
            this.layout = this.measure(!1), this.layoutVersion++, this.layoutCorrected || (this.layoutCorrected = Gt()), this.isLayoutDirty = !1, this.projectionDelta = void 0, this.notifyListeners("measure", this.layout.layoutBox);
            const {
                visualElement: h
            } = this.options;
            h && h.notify("LayoutMeasure", this.layout.layoutBox, m ? m.layoutBox : void 0)
        }
        updateScroll(m = "measure") {
            let h = !!(this.options.layoutScroll && this.instance);
            if (this.scroll && this.scroll.animationId === this.root.animationId && this.scroll.phase === m && (h = !1), h && this.instance) {
                const x = r(this.instance);
                this.scroll = {
                    animationId: this.root.animationId,
                    phase: m,
                    isRoot: x,
                    offset: l(this.instance),
                    wasRoot: this.scroll ? this.scroll.isRoot : x
                }
            }
        }
        resetTransform() {
            if (!f) return;
            const m = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout,
                h = this.projectionDelta && !ox(this.projectionDelta),
                x = this.getTransformTemplate(),
                y = x ? x(this.latestValues, "") : void 0,
                g = y !== this.prevTransformTemplateValue;
            m && this.instance && (h || Ri(this.latestValues) || g) && (f(this.instance, y), this.shouldResetTransform = !1, this.scheduleRender())
        }
        measure(m = !0) {
            const h = this.measurePageBox();
            let x = this.removeElementScroll(h);
            return m && (x = this.removeTransform(x)), fN(x), {
                animationId: this.root.animationId,
                measuredBox: h,
                layoutBox: x,
                latestValues: {},
                source: this.id
            }
        }
        measurePageBox() {
            var y;
            const {
                visualElement: m
            } = this.options;
            if (!m) return Gt();
            const h = m.measureViewportBox();
            if (!(((y = this.scroll) == null ? void 0 : y.wasRoot) || this.path.some(dN))) {
                const {
                    scroll: g
                } = this.root;
                g && (ea(h.x, g.offset.x), ea(h.y, g.offset.y))
            }
            return h
        }
        removeElementScroll(m) {
            var x;
            const h = Gt();
            if (kn(h, m), (x = this.scroll) != null && x.wasRoot) return h;
            for (let y = 0; y < this.path.length; y++) {
                const g = this.path[y],
                    {
                        scroll: b,
                        options: S
                    } = g;
                g !== this.root && b && S.layoutScroll && (b.wasRoot && kn(h, m), ea(h.x, b.offset.x), ea(h.y, b.offset.y))
            }
            return h
        }
        applyTransform(m, h = !1, x) {
            var g, b;
            const y = x || Gt();
            kn(y, m);
            for (let S = 0; S < this.path.length; S++) {
                const j = this.path[S];
                !h && j.options.layoutScroll && j.scroll && j !== j.root && (ea(y.x, -j.scroll.offset.x), ea(y.y, -j.scroll.offset.y)), Ri(j.latestValues) && uo(y, j.latestValues, (g = j.layout) == null ? void 0 : g.layoutBox)
            }
            return Ri(this.latestValues) && uo(y, this.latestValues, (b = this.layout) == null ? void 0 : b.layoutBox), y
        }
        removeTransform(m) {
            var x;
            const h = Gt();
            kn(h, m);
            for (let y = 0; y < this.path.length; y++) {
                const g = this.path[y];
                if (!Ri(g.latestValues)) continue;
                let b;
                g.instance && (Rf(g.latestValues) && g.updateSnapshot(), b = Gt(), kn(b, g.measurePageBox())), Fg(h, g.latestValues, (x = g.snapshot) == null ? void 0 : x.layoutBox, b)
            }
            return Ri(this.latestValues) && Fg(h, this.latestValues), h
        }
        setTargetDelta(m) {
            this.targetDelta = m, this.root.scheduleUpdateProjection(), this.isProjectionDirty = !0
        }
        setOptions(m) {
            this.options = {
                ...this.options,
                ...m,
                crossfade: m.crossfade !== void 0 ? m.crossfade : !0
            }
        }
        clearMeasurements() {
            this.scroll = void 0, this.layout = void 0, this.snapshot = void 0, this.prevTransformTemplateValue = void 0, this.targetDelta = void 0, this.target = void 0, this.isLayoutDirty = !1
        }
        forceRelativeParentToResolveTarget() {
            this.relativeParent && this.relativeParent.resolvedRelativeTargetAt !== Wt.timestamp && this.relativeParent.resolveTargetDelta(!0)
        }
        resolveTargetDelta(m = !1) {
            var j;
            const h = this.getLead();
            this.isProjectionDirty || (this.isProjectionDirty = h.isProjectionDirty), this.isTransformDirty || (this.isTransformDirty = h.isTransformDirty), this.isSharedProjectionDirty || (this.isSharedProjectionDirty = h.isSharedProjectionDirty);
            const x = !!this.resumingFrom || this !== h;
            if (!(m || x && this.isSharedProjectionDirty || this.isProjectionDirty || (j = this.parent) != null && j.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize)) return;
            const {
                layout: g,
                layoutId: b
            } = this.options;
            if (!this.layout || !(g || b)) return;
            this.resolvedRelativeTargetAt = Wt.timestamp;
            const S = this.getClosestProjectingParent();
            S && this.linkedParentVersion !== S.layoutVersion && !S.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && S && S.layout ? this.createRelativeTarget(S, this.layout.layoutBox, S.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = Gt(), this.targetWithTransforms = Gt()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), zT(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : kn(this.target, this.layout.layoutBox), Jy(this.target, this.targetDelta)) : kn(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && S && !!S.resumingFrom == !!this.resumingFrom && !S.options.layoutScroll && S.target && this.animationProgress !== 1 ? this.createRelativeTarget(S, this.target, S.target) : this.relativeParent = this.relativeTarget = void 0))
        }
        getClosestProjectingParent() {
            if (!(!this.parent || Rf(this.parent.latestValues) || Fy(this.parent.latestValues))) return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent()
        }
        isProjecting() {
            return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout)
        }
        createRelativeTarget(m, h, x) {
            this.relativeParent = m, this.linkedParentVersion = m.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = Gt(), this.relativeTargetOrigin = Gt(), To(this.relativeTargetOrigin, h, x, this.options.layoutAnchor || void 0), kn(this.relativeTarget, this.relativeTargetOrigin)
        }
        removeRelativeTarget() {
            this.relativeParent = this.relativeTarget = void 0
        }
        calcProjection() {
            var A;
            const m = this.getLead(),
                h = !!this.resumingFrom || this !== m;
            let x = !0;
            if ((this.isProjectionDirty || (A = this.parent) != null && A.isProjectionDirty) && (x = !1), h && (this.isSharedProjectionDirty || this.isTransformDirty) && (x = !1), this.resolvedRelativeTargetAt === Wt.timestamp && (x = !1), x) return;
            const {
                layout: y,
                layoutId: g
            } = this.options;
            if (this.isTreeAnimating = !!(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation), this.isTreeAnimating || (this.targetDelta = this.relativeTarget = void 0), !this.layout || !(y || g)) return;
            kn(this.layoutCorrected, this.layout.layoutBox);
            const b = this.treeScale.x,
                S = this.treeScale.y;
            oT(this.layoutCorrected, this.treeScale, this.path, h), m.layout && !m.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (m.target = m.layout.layoutBox, m.targetWithTransforms = Gt());
            const {
                target: j
            } = m;
            if (!j) {
                this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
                return
            }!this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (kg(this.prevProjectionDelta.x, this.projectionDelta.x), kg(this.prevProjectionDelta.y, this.projectionDelta.y)), Ml(this.projectionDelta, this.layoutCorrected, j, this.latestValues), (this.treeScale.x !== b || this.treeScale.y !== S || !e0(this.projectionDelta.x, this.prevProjectionDelta.x) || !e0(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", j))
        }
        hide() {
            this.isVisible = !1
        }
        show() {
            this.isVisible = !0
        }
        scheduleRender(m = !0) {
            var h;
            if ((h = this.options.visualElement) == null || h.scheduleRender(), m) {
                const x = this.getStack();
                x && x.scheduleRender()
            }
            this.resumingFrom && !this.resumingFrom.instance && (this.resumingFrom = void 0)
        }
        createProjectionDeltas() {
            this.prevProjectionDelta = xs(), this.projectionDelta = xs(), this.projectionDeltaWithTransform = xs()
        }
        setAnimationOrigin(m, h = !1) {
            const x = this.snapshot,
                y = x ? x.latestValues : {},
                g = {
                    ...this.latestValues
                },
                b = xs();
            (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !h;
            const S = Gt(),
                j = x ? x.source : void 0,
                A = this.layout ? this.layout.source : void 0,
                G = j !== A,
                Y = this.getStack(),
                U = !Y || Y.members.length <= 1,
                I = !!(G && !U && this.options.crossfade === !0 && !this.path.some(cN));
            this.animationProgress = 0;
            let P;
            this.mixTargetDelta = W => {
                const se = W / 1e3;
                r0(b.x, m.x, se), r0(b.y, m.y, se), this.setTargetDelta(b), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (To(S, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), oN(this.relativeTarget, this.relativeTargetOrigin, S, se), P && BT(this.relativeTarget, P) && (this.isProjectionDirty = !1), P || (P = Gt()), kn(P, this.relativeTarget)), G && (this.animationValues = g, GT(g, y, this.latestValues, se, I, U)), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = se
            }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0)
        }
        startAnimation(m) {
            var h, x, y;
            this.notifyListeners("animationStart"), (h = this.currentAnimation) == null || h.stop(), (y = (x = this.resumingFrom) == null ? void 0 : x.currentAnimation) == null || y.stop(), this.pendingAnimation && (ii(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = lt.update(() => {
                mo.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = Ss(0)), this.motionValue.jump(0, !1), this.currentAnimation = kT(this.motionValue, [0, 1e3], {
                    ...m,
                    velocity: 0,
                    isSync: !0,
                    onUpdate: g => {
                        this.mixTargetDelta(g), m.onUpdate && m.onUpdate(g)
                    },
                    onStop: () => {},
                    onComplete: () => {
                        m.onComplete && m.onComplete(), this.completeAnimation()
                    }
                }), this.resumingFrom && (this.resumingFrom.currentAnimation = this.currentAnimation), this.pendingAnimation = void 0
            })
        }
        completeAnimation() {
            this.resumingFrom && (this.resumingFrom.currentAnimation = void 0, this.resumingFrom.preserveOpacity = void 0);
            const m = this.getStack();
            m && m.exitAnimationComplete(), this.resumingFrom = this.currentAnimation = this.animationValues = void 0, this.notifyListeners("animationComplete")
        }
        finishAnimation() {
            this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(PT), this.currentAnimation.stop()), this.completeAnimation()
        }
        applyTransformsToTarget() {
            const m = this.getLead();
            let {
                targetWithTransforms: h,
                target: x,
                layout: y,
                latestValues: g
            } = m;
            if (!(!h || !x || !y)) {
                if (this !== m && this.layout && y && hx(this.options.animationType, this.layout.layoutBox, y.layoutBox)) {
                    x = this.target || Gt();
                    const b = rn(this.layout.layoutBox.x);
                    x.x.min = m.target.x.min, x.x.max = x.x.min + b;
                    const S = rn(this.layout.layoutBox.y);
                    x.y.min = m.target.y.min, x.y.max = x.y.min + S
                }
                kn(h, x), uo(h, g), Ml(this.projectionDeltaWithTransform, this.layoutCorrected, h, g)
            }
        }
        registerSharedNode(m, h) {
            this.sharedNodes.has(m) || this.sharedNodes.set(m, new QT), this.sharedNodes.get(m).add(h);
            const y = h.options.initialPromotionConfig;
            h.promote({
                transition: y ? y.transition : void 0,
                preserveFollowOpacity: y && y.shouldPreserveFollowOpacity ? y.shouldPreserveFollowOpacity(h) : void 0
            })
        }
        isLead() {
            const m = this.getStack();
            return m ? m.lead === this : !0
        }
        getLead() {
            var h;
            const {
                layoutId: m
            } = this.options;
            return m ? ((h = this.getStack()) == null ? void 0 : h.lead) || this : this
        }
        getPrevLead() {
            var h;
            const {
                layoutId: m
            } = this.options;
            return m ? (h = this.getStack()) == null ? void 0 : h.prevLead : void 0
        }
        getStack() {
            const {
                layoutId: m
            } = this.options;
            if (m) return this.root.sharedNodes.get(m)
        }
        promote({
            needsReset: m,
            transition: h,
            preserveFollowOpacity: x
        } = {}) {
            const y = this.getStack();
            y && y.promote(this, x), m && (this.projectionDelta = void 0, this.needsReset = !0), h && this.setOptions({
                transition: h
            })
        }
        relegate() {
            const m = this.getStack();
            return m ? m.relegate(this) : !1
        }
        resetSkewAndRotation() {
            const {
                visualElement: m
            } = this.options;
            if (!m) return;
            let h = !1;
            const {
                latestValues: x
            } = m;
            if ((x.z || x.rotate || x.rotateX || x.rotateY || x.rotateZ || x.skewX || x.skewY) && (h = !0), !h) return;
            const y = {};
            x.z && Wu("z", m, y, this.animationValues);
            for (let g = 0; g < Iu.length; g++) Wu(`rotate${Iu[g]}`, m, y, this.animationValues), Wu(`skew${Iu[g]}`, m, y, this.animationValues);
            m.render();
            for (const g in y) m.setStaticValue(g, y[g]), this.animationValues && (this.animationValues[g] = y[g]);
            m.scheduleRender()
        }
        applyProjectionStyles(m, h) {
            if (!this.instance || this.isSVG) return;
            if (!this.isVisible) {
                m.visibility = "hidden";
                return
            }
            const x = this.getTransformTemplate();
            if (this.needsReset) {
                this.needsReset = !1, m.visibility = "", m.opacity = "", m.pointerEvents = fo(h == null ? void 0 : h.pointerEvents) || "", m.transform = x ? x(this.latestValues, "") : "none";
                return
            }
            const y = this.getLead();
            if (!this.projectionDelta || !this.layout || !y.target) {
                this.options.layoutId && (m.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, m.pointerEvents = fo(h == null ? void 0 : h.pointerEvents) || ""), this.hasProjected && !Ri(this.latestValues) && (m.transform = x ? x({}, "") : "none", this.hasProjected = !1);
                return
            }
            m.visibility = "";
            const g = y.animationValues || y.latestValues;
            this.applyTransformsToTarget();
            let b = UT(this.projectionDeltaWithTransform, this.treeScale, g);
            x && (b = x(g, b)), m.transform = b;
            const {
                x: S,
                y: j
            } = this.projectionDelta;
            m.transformOrigin = `${S.origin*100}% ${j.origin*100}% 0`, y.animationValues ? m.opacity = y === this ? g.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : g.opacityExit : m.opacity = y === this ? g.opacity !== void 0 ? g.opacity : "" : g.opacityExit !== void 0 ? g.opacityExit : 0;
            for (const A in zf) {
                if (g[A] === void 0) continue;
                const {
                    correct: G,
                    applyTo: Y,
                    isCSSVariable: U
                } = zf[A], I = b === "none" ? g[A] : G(g[A], y);
                if (Y) {
                    const P = Y.length;
                    for (let W = 0; W < P; W++) m[Y[W]] = I
                } else U ? this.options.visualElement.renderState.vars[A] = I : m[A] = I
            }
            this.options.layoutId && (m.pointerEvents = y === this ? fo(h == null ? void 0 : h.pointerEvents) || "" : "none")
        }
        clearSnapshot() {
            this.resumeFrom = this.snapshot = void 0
        }
        resetTree() {
            this.root.nodes.forEach(m => {
                var h;
                return (h = m.currentAnimation) == null ? void 0 : h.stop()
            }), this.root.nodes.forEach(i0), this.root.sharedNodes.clear()
        }
    }
}

function JT(a) {
    a.updateLayout()
}

function $T(a) {
    var l;
    const i = ((l = a.resumeFrom) == null ? void 0 : l.snapshot) || a.snapshot;
    if (a.isLead() && a.layout && i && a.hasListeners("didUpdate")) {
        const {
            layoutBox: r,
            measuredBox: f
        } = a.layout, {
            animationType: d
        } = a.options, m = i.source !== a.layout.source;
        if (d === "size") Wn(b => {
            const S = m ? i.measuredBox[b] : i.layoutBox[b],
                j = rn(S);
            S.min = r[b].min, S.max = S.min + j
        });
        else if (d === "x" || d === "y") {
            const b = d === "x" ? "y" : "x";
            _f(m ? i.measuredBox[b] : i.layoutBox[b], r[b])
        } else hx(d, i.layoutBox, r) && Wn(b => {
            const S = m ? i.measuredBox[b] : i.layoutBox[b],
                j = rn(r[b]);
            S.max = S.min + j, a.relativeTarget && !a.currentAnimation && (a.isProjectionDirty = !0, a.relativeTarget[b].max = a.relativeTarget[b].min + j)
        });
        const h = xs();
        Ml(h, r, i.layoutBox);
        const x = xs();
        m ? Ml(x, a.applyTransform(f, !0), i.measuredBox) : Ml(x, r, i.layoutBox);
        const y = !ox(h);
        let g = !1;
        if (!a.resumeFrom) {
            const b = a.getClosestProjectingParent();
            if (b && !b.resumeFrom) {
                const {
                    snapshot: S,
                    layout: j
                } = b;
                if (S && j) {
                    const A = a.options.layoutAnchor || void 0,
                        G = Gt();
                    To(G, i.layoutBox, S.layoutBox, A);
                    const Y = Gt();
                    To(Y, r, j.layoutBox, A), cx(G, Y) || (g = !0), b.options.layoutRoot && (a.relativeTarget = Y, a.relativeTargetOrigin = G, a.relativeParent = b)
                }
            }
        }
        a.notifyListeners("didUpdate", {
            layout: r,
            snapshot: i,
            delta: x,
            layoutDelta: h,
            hasLayoutChanged: y,
            hasRelativeLayoutChanged: g
        })
    } else if (a.isLead()) {
        const {
            onExitComplete: r
        } = a.options;
        r && r()
    }
    a.options.transition = void 0
}

function IT(a) {
    a.parent && (a.isProjecting() || (a.isProjectionDirty = a.parent.isProjectionDirty), a.isSharedProjectionDirty || (a.isSharedProjectionDirty = !!(a.isProjectionDirty || a.parent.isProjectionDirty || a.parent.isSharedProjectionDirty)), a.isTransformDirty || (a.isTransformDirty = a.parent.isTransformDirty))
}

function WT(a) {
    a.isProjectionDirty = a.isSharedProjectionDirty = a.isTransformDirty = !1
}

function eN(a) {
    a.clearSnapshot()
}

function i0(a) {
    a.clearMeasurements()
}

function tN(a) {
    a.isLayoutDirty = !0, a.updateLayout()
}

function s0(a) {
    a.isLayoutDirty = !1
}

function nN(a) {
    a.isAnimationBlocked && a.layout && !a.isLayoutDirty && (a.snapshot = a.layout, a.isLayoutDirty = !0)
}

function aN(a) {
    const {
        visualElement: i
    } = a.options;
    i && i.getProps().onBeforeLayoutMeasure && i.notify("BeforeLayoutMeasure"), a.resetTransform()
}

function l0(a) {
    a.finishAnimation(), a.targetDelta = a.relativeTarget = a.target = void 0, a.isProjectionDirty = !0
}

function iN(a) {
    a.resolveTargetDelta()
}

function sN(a) {
    a.calcProjection()
}

function lN(a) {
    a.resetSkewAndRotation()
}

function rN(a) {
    a.removeLeadSnapshot()
}

function r0(a, i, l) {
    a.translate = ft(i.translate, 0, l), a.scale = ft(i.scale, 1, l), a.origin = i.origin, a.originPoint = i.originPoint
}

function o0(a, i, l, r) {
    a.min = ft(i.min, l.min, r), a.max = ft(i.max, l.max, r)
}

function oN(a, i, l, r) {
    o0(a.x, i.x, l.x, r), o0(a.y, i.y, l.y, r)
}

function cN(a) {
    return a.animationValues && a.animationValues.opacityExit !== void 0
}
const uN = {
        duration: .45,
        ease: [.4, 0, .1, 1]
    },
    c0 = a => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(a),
    u0 = c0("applewebkit/") && !c0("chrome/") ? Math.round : Vn;

function f0(a) {
    a.min = u0(a.min), a.max = u0(a.max)
}

function fN(a) {
    f0(a.x), f0(a.y)
}

function hx(a, i, l) {
    return a === "position" || a === "preserve-aspect" && !OT(Wg(i), Wg(l), .2)
}

function dN(a) {
    var i;
    return a !== a.root && ((i = a.scroll) == null ? void 0 : i.wasRoot)
}
const mN = mx({
        attachResizeListener: (a, i) => Dl(a, "resize", i),
        measureScroll: () => {
            var a, i;
            return {
                x: document.documentElement.scrollLeft || ((a = document.body) == null ? void 0 : a.scrollLeft) || 0,
                y: document.documentElement.scrollTop || ((i = document.body) == null ? void 0 : i.scrollTop) || 0
            }
        },
        checkIsScrollRoot: () => !0
    }),
    ef = {
        current: void 0
    },
    px = mx({
        measureScroll: a => ({
            x: a.scrollLeft,
            y: a.scrollTop
        }),
        defaultParent: () => {
            if (!ef.current) {
                const a = new mN({});
                a.mount(window), a.setOptions({
                    layoutScroll: !0
                }), ef.current = a
            }
            return ef.current
        },
        resetTransform: (a, i) => {
            a.style.transform = i !== void 0 ? i : "none"
        },
        checkIsScrollRoot: a => window.getComputedStyle(a).position === "fixed"
    }),
    fd = M.createContext({
        transformPagePoint: a => a,
        isStatic: !1,
        reducedMotion: "never"
    });

function d0(a, i) {
    if (typeof a == "function") return a(i);
    a != null && (a.current = i)
}

function hN(...a) {
    return i => {
        let l = !1;
        const r = a.map(f => {
            const d = d0(f, i);
            return !l && typeof d == "function" && (l = !0), d
        });
        if (l) return () => {
            for (let f = 0; f < r.length; f++) {
                const d = r[f];
                typeof d == "function" ? d() : d0(a[f], null)
            }
        }
    }
}

function pN(...a) {
    return M.useCallback(hN(...a), a)
}
class gN extends M.Component {
    getSnapshotBeforeUpdate(i) {
        const l = this.props.childRef.current;
        if (lo(l) && i.isPresent && !this.props.isPresent && this.props.pop !== !1) {
            const r = l.offsetParent,
                f = lo(r) && r.offsetWidth || 0,
                d = lo(r) && r.offsetHeight || 0,
                m = getComputedStyle(l),
                h = this.props.sizeRef.current;
            h.height = parseFloat(m.height), h.width = parseFloat(m.width), h.top = l.offsetTop, h.left = l.offsetLeft, h.right = f - h.width - h.left, h.bottom = d - h.height - h.top
        }
        return null
    }
    componentDidUpdate() {}
    render() {
        return this.props.children
    }
}

function yN({
    children: a,
    isPresent: i,
    anchorX: l,
    anchorY: r,
    root: f,
    pop: d
}) {
    var S;
    const m = M.useId(),
        h = M.useRef(null),
        x = M.useRef({
            width: 0,
            height: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
        }),
        {
            nonce: y
        } = M.useContext(fd),
        g = ((S = a.props) == null ? void 0 : S.ref) ?? (a == null ? void 0 : a.ref),
        b = pN(h, g);
    return M.useInsertionEffect(() => {
        const {
            width: j,
            height: A,
            top: G,
            left: Y,
            right: U,
            bottom: I
        } = x.current;
        if (i || d === !1 || !h.current || !j || !A) return;
        const P = l === "left" ? `left: ${Y}` : `right: ${U}`,
            W = r === "bottom" ? `bottom: ${I}` : `top: ${G}`;
        h.current.dataset.motionPopId = m;
        const se = document.createElement("style");
        y && (se.nonce = y);
        const he = f ?? document.head;
        return he.appendChild(se), se.sheet && se.sheet.insertRule(`
          [data-motion-pop-id="${m}"] {
            position: absolute !important;
            width: ${j}px !important;
            height: ${A}px !important;
            ${P}px !important;
            ${W}px !important;
          }
        `), () => {
            var $;
            ($ = h.current) == null || $.removeAttribute("data-motion-pop-id"), he.contains(se) && he.removeChild(se)
        }
    }, [i]), u.jsx(gN, {
        isPresent: i,
        childRef: h,
        sizeRef: x,
        pop: d,
        children: d === !1 ? a : M.cloneElement(a, {
            ref: b
        })
    })
}
const xN = ({
    children: a,
    initial: i,
    isPresent: l,
    onExitComplete: r,
    custom: f,
    presenceAffectsLayout: d,
    mode: m,
    anchorX: h,
    anchorY: x,
    root: y
}) => {
    const g = Gf(vN),
        b = M.useId();
    let S = !0,
        j = M.useMemo(() => (S = !1, {
            id: b,
            initial: i,
            isPresent: l,
            custom: f,
            onExitComplete: A => {
                g.set(A, !0);
                for (const G of g.values())
                    if (!G) return;
                r && r()
            },
            register: A => (g.set(A, !1), () => g.delete(A))
        }), [l, g, r]);
    return d && S && (j = {
        ...j
    }), M.useMemo(() => {
        g.forEach((A, G) => g.set(G, !1))
    }, [l]), M.useEffect(() => {
        !l && !g.size && r && r()
    }, [l]), a = u.jsx(yN, {
        pop: m === "popLayout",
        isPresent: l,
        anchorX: h,
        anchorY: x,
        root: y,
        children: a
    }), u.jsx(wo.Provider, {
        value: j,
        children: a
    })
};

function vN() {
    return new Map
}

function gx(a = !0) {
    const i = M.useContext(wo);
    if (i === null) return [!0, null];
    const {
        isPresent: l,
        onExitComplete: r,
        register: f
    } = i, d = M.useId();
    M.useEffect(() => {
        if (a) return f(d)
    }, [a]);
    const m = M.useCallback(() => a && r && r(d), [d, r, a]);
    return !l && r ? [!1, m] : [!0]
}
const Ir = a => a.key || "";

function m0(a) {
    const i = [];
    return M.Children.forEach(a, l => {
        M.isValidElement(l) && i.push(l)
    }), i
}
const Rl = ({
        children: a,
        custom: i,
        initial: l = !0,
        onExitComplete: r,
        presenceAffectsLayout: f = !0,
        mode: d = "sync",
        propagate: m = !1,
        anchorX: h = "left",
        anchorY: x = "top",
        root: y
    }) => {
        const [g, b] = gx(m), S = M.useMemo(() => m0(a), [a]), j = m && !g ? [] : S.map(Ir), A = M.useRef(!0), G = M.useRef(S), Y = Gf(() => new Map), U = M.useRef(new Set), [I, P] = M.useState(S), [W, se] = M.useState(S);
        k0(() => {
            A.current = !1, G.current = S;
            for (let ne = 0; ne < W.length; ne++) {
                const ce = Ir(W[ne]);
                j.includes(ce) ? (Y.delete(ce), U.current.delete(ce)) : Y.get(ce) !== !0 && Y.set(ce, !1)
            }
        }, [W, j.length, j.join("-")]);
        const he = [];
        if (S !== I) {
            let ne = [...S];
            for (let ce = 0; ce < W.length; ce++) {
                const te = W[ce],
                    Me = Ir(te);
                j.includes(Me) || (ne.splice(ce, 0, te), he.push(te))
            }
            return d === "wait" && he.length && (ne = he), se(m0(ne)), P(S), null
        }
        const {
            forceRender: $
        } = M.useContext(Hf);
        return u.jsx(u.Fragment, {
            children: W.map(ne => {
                const ce = Ir(ne),
                    te = m && !g ? !1 : S === W || j.includes(ce),
                    Me = () => {
                        if (U.current.has(ce)) return;
                        if (Y.has(ce)) U.current.add(ce), Y.set(ce, !0);
                        else return;
                        let Se = !0;
                        Y.forEach(Fe => {
                            Fe || (Se = !1)
                        }), Se && ($ == null || $(), se(G.current), m && (b == null || b()), r && r())
                    };
                return u.jsx(xN, {
                    isPresent: te,
                    initial: !A.current || l ? void 0 : !1,
                    custom: i,
                    presenceAffectsLayout: f,
                    mode: d,
                    root: y,
                    onExitComplete: te ? void 0 : Me,
                    anchorX: h,
                    anchorY: x,
                    children: ne
                }, ce)
            })
        })
    },
    yx = M.createContext({
        strict: !1
    }),
    h0 = {
        animation: ["animate", "variants", "whileHover", "whileTap", "exit", "whileInView", "whileFocus", "whileDrag"],
        exit: ["exit"],
        drag: ["drag", "dragControls"],
        focus: ["whileFocus"],
        hover: ["whileHover", "onHoverStart", "onHoverEnd"],
        tap: ["whileTap", "onTap", "onTapStart", "onTapCancel"],
        pan: ["onPan", "onPanStart", "onPanSessionStart", "onPanEnd"],
        inView: ["whileInView", "onViewportEnter", "onViewportLeave"],
        layout: ["layout", "layoutId"]
    };
let p0 = !1;

function bN() {
    if (p0) return;
    const a = {};
    for (const i in h0) a[i] = {
        isEnabled: l => h0[i].some(r => !!l[r])
    };
    Zy(a), p0 = !0
}

function xx() {
    return bN(), iT()
}

function SN(a) {
    const i = xx();
    for (const l in a) i[l] = {
        ...i[l],
        ...a[l]
    };
    Zy(i)
}
const TN = new Set(["animate", "exit", "variants", "initial", "style", "values", "variants", "transition", "transformTemplate", "custom", "inherit", "onBeforeLayoutMeasure", "onAnimationStart", "onAnimationComplete", "onUpdate", "onDragStart", "onDrag", "onDragEnd", "onMeasureDragConstraints", "onDirectionLock", "onDragTransitionEnd", "_dragX", "_dragY", "onHoverStart", "onHoverEnd", "onViewportEnter", "onViewportLeave", "globalTapTarget", "propagate", "ignoreStrict", "viewport"]);

function No(a) {
    return a.startsWith("while") || a.startsWith("drag") && a !== "draggable" || a.startsWith("layout") || a.startsWith("onTap") || a.startsWith("onPan") || a.startsWith("onLayout") || TN.has(a)
}
let vx = a => !No(a);

function NN(a) {
    typeof a == "function" && (vx = i => i.startsWith("on") ? !No(i) : a(i))
}
try {
    NN(require("@emotion/is-prop-valid").default)
} catch {}

function jN(a, i, l) {
    const r = {};
    for (const f in a) f === "values" && typeof a.values == "object" || en(a[f]) || (vx(f) || l === !0 && No(f) || !i && !No(f) || a.draggable && f.startsWith("onDrag")) && (r[f] = a[f]);
    return r
}
const Do = M.createContext({});

function MN(a, i) {
    if (Co(a)) {
        const {
            initial: l,
            animate: r
        } = a;
        return {
            initial: l === !1 || Cl(l) ? l : void 0,
            animate: Cl(r) ? r : void 0
        }
    }
    return a.inherit !== !1 ? i : {}
}

function wN(a) {
    const {
        initial: i,
        animate: l
    } = MN(a, M.useContext(Do));
    return M.useMemo(() => ({
        initial: i,
        animate: l
    }), [g0(i), g0(l)])
}

function g0(a) {
    return Array.isArray(a) ? a.join(" ") : a
}
const dd = () => ({
    style: {},
    transform: {},
    transformOrigin: {},
    vars: {}
});

function bx(a, i, l) {
    for (const r in i) !en(i[r]) && !Wy(r, l) && (a[r] = i[r])
}

function AN({
    transformTemplate: a
}, i) {
    return M.useMemo(() => {
        const l = dd();
        return cd(l, i, a), Object.assign({}, l.vars, l.style)
    }, [i])
}

function EN(a, i) {
    const l = a.style || {},
        r = {};
    return bx(r, l, a), Object.assign(r, AN(a, i)), r
}

function CN(a, i) {
    const l = {},
        r = EN(a, i);
    return a.drag && a.dragListener !== !1 && (l.draggable = !1, r.userSelect = r.WebkitUserSelect = r.WebkitTouchCallout = "none", r.touchAction = a.drag === !0 ? "none" : `pan-${a.drag==="x"?"y":"x"}`), a.tabIndex === void 0 && (a.onTap || a.onTapStart || a.whileTap) && (l.tabIndex = 0), l.style = r, l
}
const Sx = () => ({
    ...dd(),
    attrs: {}
});

function DN(a, i, l, r) {
    const f = M.useMemo(() => {
        const d = Sx();
        return ex(d, i, nx(r), a.transformTemplate, a.style), {
            ...d.attrs,
            style: {
                ...d.style
            }
        }
    }, [i]);
    if (a.style) {
        const d = {};
        bx(d, a.style, a), f.style = {
            ...d,
            ...f.style
        }
    }
    return f
}
const RN = ["animate", "circle", "defs", "desc", "ellipse", "g", "image", "line", "filter", "marker", "mask", "metadata", "path", "pattern", "polygon", "polyline", "rect", "stop", "switch", "symbol", "svg", "text", "tspan", "use", "view"];

function md(a) {
    return typeof a != "string" || a.includes("-") ? !1 : !!(RN.indexOf(a) > -1 || /[A-Z]/u.test(a))
}

function ON(a, i, l, {
    latestValues: r
}, f, d = !1, m) {
    const x = (m ?? md(a) ? DN : CN)(i, r, f, a),
        y = jN(i, typeof a == "string", d),
        g = a !== M.Fragment ? {
            ...y,
            ...x,
            ref: l
        } : {},
        {
            children: b
        } = i,
        S = M.useMemo(() => en(b) ? b.get() : b, [b]);
    return M.createElement(a, {
        ...g,
        children: S
    })
}

function zN({
    scrapeMotionValuesFromProps: a,
    createRenderState: i
}, l, r, f) {
    return {
        latestValues: _N(l, r, f, a),
        renderState: i()
    }
}

function _N(a, i, l, r) {
    const f = {},
        d = r(a, {});
    for (const S in d) f[S] = fo(d[S]);
    let {
        initial: m,
        animate: h
    } = a;
    const x = Co(a),
        y = Xy(a);
    i && y && !x && a.inherit !== !1 && (m === void 0 && (m = i.initial), h === void 0 && (h = i.animate));
    let g = l ? l.initial === !1 : !1;
    g = g || m === !1;
    const b = g ? h : m;
    if (b && typeof b != "boolean" && !Eo(b)) {
        const S = Array.isArray(b) ? b : [b];
        for (let j = 0; j < S.length; j++) {
            const A = td(a, S[j]);
            if (A) {
                const {
                    transitionEnd: G,
                    transition: Y,
                    ...U
                } = A;
                for (const I in U) {
                    let P = U[I];
                    if (Array.isArray(P)) {
                        const W = g ? P.length - 1 : 0;
                        P = P[W]
                    }
                    P !== null && (f[I] = P)
                }
                for (const I in G) f[I] = G[I]
            }
        }
    }
    return f
}
const Tx = a => (i, l) => {
        const r = M.useContext(Do),
            f = M.useContext(wo),
            d = () => zN(a, i, r, f);
        return l ? d() : Gf(d)
    },
    LN = Tx({
        scrapeMotionValuesFromProps: ud,
        createRenderState: dd
    }),
    VN = Tx({
        scrapeMotionValuesFromProps: ax,
        createRenderState: Sx
    }),
    BN = Symbol.for("motionComponentSymbol");

function UN(a, i, l) {
    const r = M.useRef(l);
    M.useInsertionEffect(() => {
        r.current = l
    });
    const f = M.useRef(null);
    return M.useCallback(d => {
        var h;
        d && ((h = a.onMount) == null || h.call(a, d));
        const m = r.current;
        if (typeof m == "function")
            if (d) {
                const x = m(d);
                typeof x == "function" && (f.current = x)
            } else f.current ? (f.current(), f.current = null) : m(d);
        else m && (m.current = d);
        i && (d ? i.mount(d) : i.unmount())
    }, [i])
}
const Nx = M.createContext({});

function ps(a) {
    return a && typeof a == "object" && Object.prototype.hasOwnProperty.call(a, "current")
}

function HN(a, i, l, r, f, d) {
    var P, W;
    const {
        visualElement: m
    } = M.useContext(Do), h = M.useContext(yx), x = M.useContext(wo), y = M.useContext(fd), g = y.reducedMotion, b = y.skipAnimations, S = M.useRef(null), j = M.useRef(!1);
    r = r || h.renderer, !S.current && r && (S.current = r(a, {
        visualState: i,
        parent: m,
        props: l,
        presenceContext: x,
        blockInitialAnimation: x ? x.initial === !1 : !1,
        reducedMotionConfig: g,
        skipAnimations: b,
        isSVG: d
    }), j.current && S.current && (S.current.manuallyAnimateOnMount = !0));
    const A = S.current,
        G = M.useContext(Nx);
    A && !A.projection && f && (A.type === "html" || A.type === "svg") && GN(S.current, l, f, G);
    const Y = M.useRef(!1);
    M.useInsertionEffect(() => {
        A && Y.current && A.update(l, x)
    });
    const U = l[Ry],
        I = M.useRef(!!U && typeof window < "u" && !((P = window.MotionHandoffIsComplete) != null && P.call(window, U)) && ((W = window.MotionHasOptimisedAnimation) == null ? void 0 : W.call(window, U)));
    return k0(() => {
        j.current = !0, A && (Y.current = !0, window.MotionIsMounted = !0, A.updateFeatures(), A.scheduleRenderMicrotask(), I.current && A.animationState && A.animationState.animateChanges())
    }), M.useEffect(() => {
        A && (!I.current && A.animationState && A.animationState.animateChanges(), I.current && (queueMicrotask(() => {
            var se;
            (se = window.MotionHandoffMarkAsComplete) == null || se.call(window, U)
        }), I.current = !1), A.enteringChildren = void 0)
    }), A
}

function GN(a, i, l, r) {
    const {
        layoutId: f,
        layout: d,
        drag: m,
        dragConstraints: h,
        layoutScroll: x,
        layoutRoot: y,
        layoutAnchor: g,
        layoutCrossfade: b
    } = i;
    a.projection = new l(a.latestValues, i["data-framer-portal-id"] ? void 0 : jx(a.parent)), a.projection.setOptions({
        layoutId: f,
        layout: d,
        alwaysMeasureLayout: !!m || h && ps(h),
        visualElement: a,
        animationType: typeof d == "string" ? d : "both",
        initialPromotionConfig: r,
        crossfade: b,
        layoutScroll: x,
        layoutRoot: y,
        layoutAnchor: g
    })
}

function jx(a) {
    if (a) return a.options.allowProjection !== !1 ? a.projection : jx(a.parent)
}

function tf(a, {
    forwardMotionProps: i = !1,
    type: l
} = {}, r, f) {
    r && SN(r);
    const d = l ? l === "svg" : md(a),
        m = d ? VN : LN;

    function h(y, g) {
        let b;
        const S = {
                ...M.useContext(fd),
                ...y,
                layoutId: YN(y)
            },
            {
                isStatic: j
            } = S,
            A = wN(y),
            G = m(y, j);
        if (!j && typeof window < "u") {
            qN();
            const Y = kN(S);
            b = Y.MeasureLayout, A.visualElement = HN(a, G, S, f, Y.ProjectionNode, d)
        }
        return u.jsxs(Do.Provider, {
            value: A,
            children: [b && A.visualElement ? u.jsx(b, {
                visualElement: A.visualElement,
                ...S
            }) : null, ON(a, y, UN(G, A.visualElement, g), G, j, i, d)]
        })
    }
    h.displayName = `motion.${typeof a=="string"?a:`create(${a.displayName??a.name??""})`}`;
    const x = M.forwardRef(h);
    return x[BN] = a, x
}

function YN({
    layoutId: a
}) {
    const i = M.useContext(Hf).id;
    return i && a !== void 0 ? i + "-" + a : a
}

function qN(a, i) {
    M.useContext(yx).strict
}

function kN(a) {
    const i = xx(),
        {
            drag: l,
            layout: r
        } = i;
    if (!l && !r) return {};
    const f = {
        ...l,
        ...r
    };
    return {
        MeasureLayout: l != null && l.isEnabled(a) || r != null && r.isEnabled(a) ? f.MeasureLayout : void 0,
        ProjectionNode: f.ProjectionNode
    }
}

function XN(a, i) {
    if (typeof Proxy > "u") return tf;
    const l = new Map,
        r = (d, m) => tf(d, m, a, i),
        f = (d, m) => r(d, m);
    return new Proxy(f, {
        get: (d, m) => m === "create" ? r : (l.has(m) || l.set(m, tf(m, void 0, a, i)), l.get(m))
    })
}
const KN = (a, i) => i.isSVG ?? md(a) ? new ST(i) : new pT(i, {
    allowProjection: a !== M.Fragment
});
class ZN extends si {
    constructor(i) {
        super(i), i.animationState || (i.animationState = wT(i))
    }
    updateAnimationControlsSubscription() {
        const {
            animate: i
        } = this.node.getProps();
        Eo(i) && (this.unmountControls = i.subscribe(this.node))
    }
    mount() {
        this.updateAnimationControlsSubscription()
    }
    update() {
        const {
            animate: i
        } = this.node.getProps(), {
            animate: l
        } = this.node.prevProps || {};
        i !== l && this.updateAnimationControlsSubscription()
    }
    unmount() {
        var i;
        this.node.animationState.reset(), (i = this.unmountControls) == null || i.call(this)
    }
}
let QN = 0;
class PN extends si {
    constructor() {
        super(...arguments), this.id = QN++, this.isExitComplete = !1
    }
    update() {
        var d;
        if (!this.node.presenceContext) return;
        const {
            isPresent: i,
            onExitComplete: l
        } = this.node.presenceContext, {
            isPresent: r
        } = this.node.prevPresenceContext || {};
        if (!this.node.animationState || i === r) return;
        if (i && r === !1) {
            if (this.isExitComplete) {
                const {
                    initial: m,
                    custom: h
                } = this.node.getProps();
                if (typeof m == "string") {
                    const x = Li(this.node, m, h);
                    if (x) {
                        const {
                            transition: y,
                            transitionEnd: g,
                            ...b
                        } = x;
                        for (const S in b)(d = this.node.getValue(S)) == null || d.jump(b[S])
                    }
                }
                this.node.animationState.reset(), this.node.animationState.animateChanges()
            } else this.node.animationState.setActive("exit", !1);
            this.isExitComplete = !1;
            return
        }
        const f = this.node.animationState.setActive("exit", !i);
        l && !i && f.then(() => {
            this.isExitComplete = !0, l(this.id)
        })
    }
    mount() {
        const {
            register: i,
            onExitComplete: l
        } = this.node.presenceContext || {};
        l && l(this.id), i && (this.unmount = i(this.id))
    }
    unmount() {}
}
const FN = {
    animation: {
        Feature: ZN
    },
    exit: {
        Feature: PN
    }
};

function Ll(a) {
    return {
        point: {
            x: a.pageX,
            y: a.pageY
        }
    }
}
const JN = a => i => sd(i) && a(i, Ll(i));

function wl(a, i, l, r) {
    return Dl(a, i, JN(l), r)
}
const Mx = ({
        current: a
    }) => a ? a.ownerDocument.defaultView : null,
    y0 = (a, i) => Math.abs(a - i);

function $N(a, i) {
    const l = y0(a.x, i.x),
        r = y0(a.y, i.y);
    return Math.sqrt(l ** 2 + r ** 2)
}
const x0 = new Set(["auto", "scroll"]);
class wx {
    constructor(i, l, {
        transformPagePoint: r,
        contextWindow: f = window,
        dragSnapToOrigin: d = !1,
        distanceThreshold: m = 3,
        element: h
    } = {}) {
        if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = new Map, this.removeScrollListeners = null, this.onElementScroll = j => {
                this.handleScroll(j.target)
            }, this.onWindowScroll = () => {
                this.handleScroll(window)
            }, this.updatePoint = () => {
                if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return;
                this.lastRawMoveEventInfo && (this.lastMoveEventInfo = Wr(this.lastRawMoveEventInfo, this.transformPagePoint));
                const j = nf(this.lastMoveEventInfo, this.history),
                    A = this.startEvent !== null,
                    G = $N(j.offset, {
                        x: 0,
                        y: 0
                    }) >= this.distanceThreshold;
                if (!A && !G) return;
                const {
                    point: Y
                } = j, {
                    timestamp: U
                } = Wt;
                this.history.push({
                    ...Y,
                    timestamp: U
                });
                const {
                    onStart: I,
                    onMove: P
                } = this.handlers;
                A || (I && I(this.lastMoveEvent, j), this.startEvent = this.lastMoveEvent), P && P(this.lastMoveEvent, j)
            }, this.handlePointerMove = (j, A) => {
                this.lastMoveEvent = j, this.lastRawMoveEventInfo = A, this.lastMoveEventInfo = Wr(A, this.transformPagePoint), lt.update(this.updatePoint, !0)
            }, this.handlePointerUp = (j, A) => {
                this.end();
                const {
                    onEnd: G,
                    onSessionEnd: Y,
                    resumeAnimation: U
                } = this.handlers;
                if ((this.dragSnapToOrigin || !this.startEvent) && U && U(), !(this.lastMoveEvent && this.lastMoveEventInfo)) return;
                const I = nf(j.type === "pointercancel" ? this.lastMoveEventInfo : Wr(A, this.transformPagePoint), this.history);
                this.startEvent && G && G(j, I), Y && Y(j, I)
            }, !sd(i)) return;
        this.dragSnapToOrigin = d, this.handlers = l, this.transformPagePoint = r, this.distanceThreshold = m, this.contextWindow = f || window;
        const x = Ll(i),
            y = Wr(x, this.transformPagePoint),
            {
                point: g
            } = y,
            {
                timestamp: b
            } = Wt;
        this.history = [{
            ...g,
            timestamp: b
        }];
        const {
            onSessionStart: S
        } = l;
        S && S(i, nf(y, this.history)), this.removeListeners = Ol(wl(this.contextWindow, "pointermove", this.handlePointerMove), wl(this.contextWindow, "pointerup", this.handlePointerUp), wl(this.contextWindow, "pointercancel", this.handlePointerUp)), h && this.startScrollTracking(h)
    }
    startScrollTracking(i) {
        let l = i.parentElement;
        for (; l;) {
            const r = getComputedStyle(l);
            (x0.has(r.overflowX) || x0.has(r.overflowY)) && this.scrollPositions.set(l, {
                x: l.scrollLeft,
                y: l.scrollTop
            }), l = l.parentElement
        }
        this.scrollPositions.set(window, {
            x: window.scrollX,
            y: window.scrollY
        }), window.addEventListener("scroll", this.onElementScroll, {
            capture: !0
        }), window.addEventListener("scroll", this.onWindowScroll), this.removeScrollListeners = () => {
            window.removeEventListener("scroll", this.onElementScroll, {
                capture: !0
            }), window.removeEventListener("scroll", this.onWindowScroll)
        }
    }
    handleScroll(i) {
        const l = this.scrollPositions.get(i);
        if (!l) return;
        const r = i === window,
            f = r ? {
                x: window.scrollX,
                y: window.scrollY
            } : {
                x: i.scrollLeft,
                y: i.scrollTop
            },
            d = {
                x: f.x - l.x,
                y: f.y - l.y
            };
        d.x === 0 && d.y === 0 || (r ? this.lastMoveEventInfo && (this.lastMoveEventInfo.point.x += d.x, this.lastMoveEventInfo.point.y += d.y) : this.history.length > 0 && (this.history[0].x -= d.x, this.history[0].y -= d.y), this.scrollPositions.set(i, f), lt.update(this.updatePoint, !0))
    }
    updateHandlers(i) {
        this.handlers = i
    }
    end() {
        this.removeListeners && this.removeListeners(), this.removeScrollListeners && this.removeScrollListeners(), this.scrollPositions.clear(), ii(this.updatePoint)
    }
}

function Wr(a, i) {
    return i ? {
        point: i(a.point)
    } : a
}

function v0(a, i) {
    return {
        x: a.x - i.x,
        y: a.y - i.y
    }
}

function nf({
    point: a
}, i) {
    return {
        point: a,
        delta: v0(a, Ax(i)),
        offset: v0(a, IN(i)),
        velocity: WN(i, .1)
    }
}

function IN(a) {
    return a[0]
}

function Ax(a) {
    return a[a.length - 1]
}

function WN(a, i) {
    if (a.length < 2) return {
        x: 0,
        y: 0
    };
    let l = a.length - 1,
        r = null;
    const f = Ax(a);
    for (; l >= 0 && (r = a[l], !(f.timestamp - r.timestamp > Tn(i)));) l--;
    if (!r) return {
        x: 0,
        y: 0
    };
    r === a[0] && a.length > 2 && f.timestamp - r.timestamp > Tn(i) * 2 && (r = a[1]);
    const d = Ln(f.timestamp - r.timestamp);
    if (d === 0) return {
        x: 0,
        y: 0
    };
    const m = {
        x: (f.x - r.x) / d,
        y: (f.y - r.y) / d
    };
    return m.x === 1 / 0 && (m.x = 0), m.y === 1 / 0 && (m.y = 0), m
}

function ej(a, {
    min: i,
    max: l
}, r) {
    return i !== void 0 && a < i ? a = r ? ft(i, a, r.min) : Math.max(a, i) : l !== void 0 && a > l && (a = r ? ft(l, a, r.max) : Math.min(a, l)), a
}

function b0(a, i, l) {
    return {
        min: i !== void 0 ? a.min + i : void 0,
        max: l !== void 0 ? a.max + l - (a.max - a.min) : void 0
    }
}

function tj(a, {
    top: i,
    left: l,
    bottom: r,
    right: f
}) {
    return {
        x: b0(a.x, l, f),
        y: b0(a.y, i, r)
    }
}

function S0(a, i) {
    let l = i.min - a.min,
        r = i.max - a.max;
    return i.max - i.min < a.max - a.min && ([l, r] = [r, l]), {
        min: l,
        max: r
    }
}

function nj(a, i) {
    return {
        x: S0(a.x, i.x),
        y: S0(a.y, i.y)
    }
}

function aj(a, i) {
    let l = .5;
    const r = rn(a),
        f = rn(i);
    return f > r ? l = Al(i.min, i.max - r, a.min) : r > f && (l = Al(a.min, a.max - f, i.min)), na(0, 1, l)
}

function ij(a, i) {
    const l = {};
    return i.min !== void 0 && (l.min = i.min - a.min), i.max !== void 0 && (l.max = i.max - a.min), l
}
const Lf = .35;

function sj(a = Lf) {
    return a === !1 ? a = 0 : a === !0 && (a = Lf), {
        x: T0(a, "left", "right"),
        y: T0(a, "top", "bottom")
    }
}

function T0(a, i, l) {
    return {
        min: N0(a, i),
        max: N0(a, l)
    }
}

function N0(a, i) {
    return typeof a == "number" ? a : a[i] || 0
}
const lj = new WeakMap;
class rj {
    constructor(i) {
        this.openDragLock = null, this.isDragging = !1, this.currentDirection = null, this.originPoint = {
            x: 0,
            y: 0
        }, this.constraints = !1, this.hasMutatedConstraints = !1, this.elastic = Gt(), this.latestPointerEvent = null, this.latestPanInfo = null, this.visualElement = i
    }
    start(i, {
        snapToCursor: l = !1,
        distanceThreshold: r
    } = {}) {
        const {
            presenceContext: f
        } = this.visualElement;
        if (f && f.isPresent === !1) return;
        const d = b => {
                l && this.snapToCursor(Ll(b).point), this.stopAnimation()
            },
            m = (b, S) => {
                const {
                    drag: j,
                    dragPropagation: A,
                    onDragStart: G
                } = this.getProps();
                if (j && !A && (this.openDragLock && this.openDragLock(), this.openDragLock = _S(j), !this.openDragLock)) return;
                this.latestPointerEvent = b, this.latestPanInfo = S, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), Wn(U => {
                    let I = this.getAxisMotionValue(U).get() || 0;
                    if (ta.test(I)) {
                        const {
                            projection: P
                        } = this.visualElement;
                        if (P && P.layout) {
                            const W = P.layout.layoutBox[U];
                            W && (I = rn(W) * (parseFloat(I) / 100))
                        }
                    }
                    this.originPoint[U] = I
                }), G && lt.update(() => G(b, S), !1, !0), wf(this.visualElement, "transform");
                const {
                    animationState: Y
                } = this.visualElement;
                Y && Y.setActive("whileDrag", !0)
            },
            h = (b, S) => {
                this.latestPointerEvent = b, this.latestPanInfo = S;
                const {
                    dragPropagation: j,
                    dragDirectionLock: A,
                    onDirectionLock: G,
                    onDrag: Y
                } = this.getProps();
                if (!j && !this.openDragLock) return;
                const {
                    offset: U
                } = S;
                if (A && this.currentDirection === null) {
                    this.currentDirection = cj(U), this.currentDirection !== null && G && G(this.currentDirection);
                    return
                }
                this.updateAxis("x", S.point, U), this.updateAxis("y", S.point, U), this.visualElement.render(), Y && lt.update(() => Y(b, S), !1, !0)
            },
            x = (b, S) => {
                this.latestPointerEvent = b, this.latestPanInfo = S, this.stop(b, S), this.latestPointerEvent = null, this.latestPanInfo = null
            },
            y = () => {
                const {
                    dragSnapToOrigin: b
                } = this.getProps();
                (b || this.constraints) && this.startAnimation({
                    x: 0,
                    y: 0
                })
            },
            {
                dragSnapToOrigin: g
            } = this.getProps();
        this.panSession = new wx(i, {
            onSessionStart: d,
            onStart: m,
            onMove: h,
            onSessionEnd: x,
            resumeAnimation: y
        }, {
            transformPagePoint: this.visualElement.getTransformPagePoint(),
            dragSnapToOrigin: g,
            distanceThreshold: r,
            contextWindow: Mx(this.visualElement),
            element: this.visualElement.current
        })
    }
    stop(i, l) {
        const r = i || this.latestPointerEvent,
            f = l || this.latestPanInfo,
            d = this.isDragging;
        if (this.cancel(), !d || !f || !r) return;
        const {
            velocity: m
        } = f;
        this.startAnimation(m);
        const {
            onDragEnd: h
        } = this.getProps();
        h && lt.postRender(() => h(r, f))
    }
    cancel() {
        this.isDragging = !1;
        const {
            projection: i,
            animationState: l
        } = this.visualElement;
        i && (i.isAnimationBlocked = !1), this.endPanSession();
        const {
            dragPropagation: r
        } = this.getProps();
        !r && this.openDragLock && (this.openDragLock(), this.openDragLock = null), l && l.setActive("whileDrag", !1)
    }
    endPanSession() {
        this.panSession && this.panSession.end(), this.panSession = void 0
    }
    updateAxis(i, l, r) {
        const {
            drag: f
        } = this.getProps();
        if (!r || !eo(i, f, this.currentDirection)) return;
        const d = this.getAxisMotionValue(i);
        let m = this.originPoint[i] + r[i];
        this.constraints && this.constraints[i] && (m = ej(m, this.constraints[i], this.elastic[i])), d.set(m)
    }
    resolveConstraints() {
        var d;
        const {
            dragConstraints: i,
            dragElastic: l
        } = this.getProps(), r = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : (d = this.visualElement.projection) == null ? void 0 : d.layout, f = this.constraints;
        i && ps(i) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : i && r ? this.constraints = tj(r.layoutBox, i) : this.constraints = !1, this.elastic = sj(l), f !== this.constraints && !ps(i) && r && this.constraints && !this.hasMutatedConstraints && Wn(m => {
            this.constraints !== !1 && this.getAxisMotionValue(m) && (this.constraints[m] = ij(r.layoutBox[m], this.constraints[m]))
        })
    }
    resolveRefConstraints() {
        const {
            dragConstraints: i,
            onMeasureDragConstraints: l
        } = this.getProps();
        if (!i || !ps(i)) return !1;
        const r = i.current,
            {
                projection: f
            } = this.visualElement;
        if (!f || !f.layout) return !1;
        const d = cT(r, f.root, this.visualElement.getTransformPagePoint());
        let m = nj(f.layout.layoutBox, d);
        if (l) {
            const h = l(lT(m));
            this.hasMutatedConstraints = !!h, h && (m = Py(h))
        }
        return m
    }
    startAnimation(i) {
        const {
            drag: l,
            dragMomentum: r,
            dragElastic: f,
            dragTransition: d,
            dragSnapToOrigin: m,
            onDragTransitionEnd: h
        } = this.getProps(), x = this.constraints || {}, y = Wn(g => {
            if (!eo(g, l, this.currentDirection)) return;
            let b = x && x[g] || {};
            (m === !0 || m === g) && (b = {
                min: 0,
                max: 0
            });
            const S = f ? 200 : 1e6,
                j = f ? 40 : 1e7,
                A = {
                    type: "inertia",
                    velocity: r ? i[g] : 0,
                    bounceStiffness: S,
                    bounceDamping: j,
                    timeConstant: 750,
                    restDelta: 1,
                    restSpeed: 10,
                    ...d,
                    ...b
                };
            return this.startAxisValueAnimation(g, A)
        });
        return Promise.all(y).then(h)
    }
    startAxisValueAnimation(i, l) {
        const r = this.getAxisMotionValue(i);
        return wf(this.visualElement, i), r.start(ed(i, r, 0, l, this.visualElement, !1))
    }
    stopAnimation() {
        Wn(i => this.getAxisMotionValue(i).stop())
    }
    getAxisMotionValue(i) {
        const l = `_drag${i.toUpperCase()}`,
            r = this.visualElement.getProps(),
            f = r[l];
        return f || this.visualElement.getValue(i, (r.initial ? r.initial[i] : void 0) || 0)
    }
    snapToCursor(i) {
        Wn(l => {
            const {
                drag: r
            } = this.getProps();
            if (!eo(l, r, this.currentDirection)) return;
            const {
                projection: f
            } = this.visualElement, d = this.getAxisMotionValue(l);
            if (f && f.layout) {
                const {
                    min: m,
                    max: h
                } = f.layout.layoutBox[l], x = d.get() || 0;
                d.set(i[l] - ft(m, h, .5) + x)
            }
        })
    }
    scalePositionWithinConstraints() {
        if (!this.visualElement.current) return;
        const {
            drag: i,
            dragConstraints: l
        } = this.getProps(), {
            projection: r
        } = this.visualElement;
        if (!ps(l) || !r || !this.constraints) return;
        this.stopAnimation();
        const f = {
            x: 0,
            y: 0
        };
        Wn(m => {
            const h = this.getAxisMotionValue(m);
            if (h && this.constraints !== !1) {
                const x = h.get();
                f[m] = aj({
                    min: x,
                    max: x
                }, this.constraints[m])
            }
        });
        const {
            transformTemplate: d
        } = this.visualElement.getProps();
        this.visualElement.current.style.transform = d ? d({}, "") : "none", r.root && r.root.updateScroll(), r.updateLayout(), this.constraints = !1, this.resolveConstraints(), Wn(m => {
            if (!eo(m, i, null)) return;
            const h = this.getAxisMotionValue(m),
                {
                    min: x,
                    max: y
                } = this.constraints[m];
            h.set(ft(x, y, f[m]))
        }), this.visualElement.render()
    }
    addListeners() {
        if (!this.visualElement.current) return;
        lj.set(this.visualElement, this);
        const i = this.visualElement.current,
            l = wl(i, "pointerdown", y => {
                const {
                    drag: g,
                    dragListener: b = !0
                } = this.getProps(), S = y.target, j = S !== i && GS(S);
                g && b && !j && this.start(y)
            });
        let r;
        const f = () => {
                const {
                    dragConstraints: y
                } = this.getProps();
                ps(y) && y.current && (this.constraints = this.resolveRefConstraints(), r || (r = oj(i, y.current, () => this.scalePositionWithinConstraints())))
            },
            {
                projection: d
            } = this.visualElement,
            m = d.addEventListener("measure", f);
        d && !d.layout && (d.root && d.root.updateScroll(), d.updateLayout()), lt.read(f);
        const h = Dl(window, "resize", () => this.scalePositionWithinConstraints()),
            x = d.addEventListener("didUpdate", (({
                delta: y,
                hasLayoutChanged: g
            }) => {
                this.isDragging && g && (Wn(b => {
                    const S = this.getAxisMotionValue(b);
                    S && (this.originPoint[b] += y[b].translate, S.set(S.get() + y[b].translate))
                }), this.visualElement.render())
            }));
        return () => {
            h(), l(), m(), x && x(), r && r()
        }
    }
    getProps() {
        const i = this.visualElement.getProps(),
            {
                drag: l = !1,
                dragDirectionLock: r = !1,
                dragPropagation: f = !1,
                dragConstraints: d = !1,
                dragElastic: m = Lf,
                dragMomentum: h = !0
            } = i;
        return {
            ...i,
            drag: l,
            dragDirectionLock: r,
            dragPropagation: f,
            dragConstraints: d,
            dragElastic: m,
            dragMomentum: h
        }
    }
}

function j0(a) {
    let i = !0;
    return () => {
        if (i) {
            i = !1;
            return
        }
        a()
    }
}

function oj(a, i, l) {
    const r = Rg(a, j0(l)),
        f = Rg(i, j0(l));
    return () => {
        r(), f()
    }
}

function eo(a, i, l) {
    return (i === !0 || i === a) && (l === null || l === a)
}

function cj(a, i = 10) {
    let l = null;
    return Math.abs(a.y) > i ? l = "y" : Math.abs(a.x) > i && (l = "x"), l
}
class uj extends si {
    constructor(i) {
        super(i), this.removeGroupControls = Vn, this.removeListeners = Vn, this.controls = new rj(i)
    }
    mount() {
        const {
            dragControls: i
        } = this.node.getProps();
        i && (this.removeGroupControls = i.subscribe(this.controls)), this.removeListeners = this.controls.addListeners() || Vn
    }
    update() {
        const {
            dragControls: i
        } = this.node.getProps(), {
            dragControls: l
        } = this.node.prevProps || {};
        i !== l && (this.removeGroupControls(), i && (this.removeGroupControls = i.subscribe(this.controls)))
    }
    unmount() {
        this.removeGroupControls(), this.removeListeners(), this.controls.isDragging || this.controls.endPanSession()
    }
}
const af = a => (i, l) => {
    a && lt.update(() => a(i, l), !1, !0)
};
class fj extends si {
    constructor() {
        super(...arguments), this.removePointerDownListener = Vn
    }
    onPointerDown(i) {
        this.session = new wx(i, this.createPanHandlers(), {
            transformPagePoint: this.node.getTransformPagePoint(),
            contextWindow: Mx(this.node)
        })
    }
    createPanHandlers() {
        const {
            onPanSessionStart: i,
            onPanStart: l,
            onPan: r,
            onPanEnd: f
        } = this.node.getProps();
        return {
            onSessionStart: af(i),
            onStart: af(l),
            onMove: af(r),
            onEnd: (d, m) => {
                delete this.session, f && lt.postRender(() => f(d, m))
            }
        }
    }
    mount() {
        this.removePointerDownListener = wl(this.node.current, "pointerdown", i => this.onPointerDown(i))
    }
    update() {
        this.session && this.session.updateHandlers(this.createPanHandlers())
    }
    unmount() {
        this.removePointerDownListener(), this.session && this.session.end()
    }
}
let sf = !1;
class dj extends M.Component {
    componentDidMount() {
        const {
            visualElement: i,
            layoutGroup: l,
            switchLayoutGroup: r,
            layoutId: f
        } = this.props, {
            projection: d
        } = i;
        d && (l.group && l.group.add(d), r && r.register && f && r.register(d), sf && d.root.didUpdate(), d.addEventListener("animationComplete", () => {
            this.safeToRemove()
        }), d.setOptions({
            ...d.options,
            layoutDependency: this.props.layoutDependency,
            onExitComplete: () => this.safeToRemove()
        })), mo.hasEverUpdated = !0
    }
    getSnapshotBeforeUpdate(i) {
        const {
            layoutDependency: l,
            visualElement: r,
            drag: f,
            isPresent: d
        } = this.props, {
            projection: m
        } = r;
        return m && (m.isPresent = d, i.layoutDependency !== l && m.setOptions({
            ...m.options,
            layoutDependency: l
        }), sf = !0, f || i.layoutDependency !== l || l === void 0 || i.isPresent !== d ? m.willUpdate() : this.safeToRemove(), i.isPresent !== d && (d ? m.promote() : m.relegate() || lt.postRender(() => {
            const h = m.getStack();
            (!h || !h.members.length) && this.safeToRemove()
        }))), null
    }
    componentDidUpdate() {
        const {
            visualElement: i,
            layoutAnchor: l
        } = this.props, {
            projection: r
        } = i;
        r && (r.options.layoutAnchor = l, r.root.didUpdate(), id.postRender(() => {
            !r.currentAnimation && r.isLead() && this.safeToRemove()
        }))
    }
    componentWillUnmount() {
        const {
            visualElement: i,
            layoutGroup: l,
            switchLayoutGroup: r
        } = this.props, {
            projection: f
        } = i;
        sf = !0, f && (f.scheduleCheckAfterUnmount(), l && l.group && l.group.remove(f), r && r.deregister && r.deregister(f))
    }
    safeToRemove() {
        const {
            safeToRemove: i
        } = this.props;
        i && i()
    }
    render() {
        return null
    }
}

function Ex(a) {
    const [i, l] = gx(), r = M.useContext(Hf);
    return u.jsx(dj, {
        ...a,
        layoutGroup: r,
        switchLayoutGroup: M.useContext(Nx),
        isPresent: i,
        safeToRemove: l
    })
}
const mj = {
    pan: {
        Feature: fj
    },
    drag: {
        Feature: uj,
        ProjectionNode: px,
        MeasureLayout: Ex
    }
};

function M0(a, i, l) {
    const {
        props: r
    } = a;
    a.animationState && r.whileHover && a.animationState.setActive("whileHover", l === "Start");
    const f = "onHover" + l,
        d = r[f];
    d && lt.postRender(() => d(i, Ll(i)))
}
class hj extends si {
    mount() {
        const {
            current: i
        } = this.node;
        i && (this.unmount = VS(i, (l, r) => (M0(this.node, r, "Start"), f => M0(this.node, f, "End"))))
    }
    unmount() {}
}
class pj extends si {
    constructor() {
        super(...arguments), this.isActive = !1
    }
    onFocus() {
        let i = !1;
        try {
            i = this.node.current.matches(":focus-visible")
        } catch {
            i = !0
        }!i || !this.node.animationState || (this.node.animationState.setActive("whileFocus", !0), this.isActive = !0)
    }
    onBlur() {
        !this.isActive || !this.node.animationState || (this.node.animationState.setActive("whileFocus", !1), this.isActive = !1)
    }
    mount() {
        this.unmount = Ol(Dl(this.node.current, "focus", () => this.onFocus()), Dl(this.node.current, "blur", () => this.onBlur()))
    }
    unmount() {}
}

function w0(a, i, l) {
    const {
        props: r
    } = a;
    if (a.current instanceof HTMLButtonElement && a.current.disabled) return;
    a.animationState && r.whileTap && a.animationState.setActive("whileTap", l === "Start");
    const f = "onTap" + (l === "End" ? "" : l),
        d = r[f];
    d && lt.postRender(() => d(i, Ll(i)))
}
class gj extends si {
    mount() {
        const {
            current: i
        } = this.node;
        if (!i) return;
        const {
            globalTapTarget: l,
            propagate: r
        } = this.node.props;
        this.unmount = qS(i, (f, d) => (w0(this.node, d, "Start"), (m, {
            success: h
        }) => w0(this.node, m, h ? "End" : "Cancel")), {
            useGlobalTarget: l,
            stopPropagation: (r == null ? void 0 : r.tap) === !1
        })
    }
    unmount() {}
}
const Vf = new WeakMap,
    lf = new WeakMap,
    yj = a => {
        const i = Vf.get(a.target);
        i && i(a)
    },
    xj = a => {
        a.forEach(yj)
    };

function vj({
    root: a,
    ...i
}) {
    const l = a || document;
    lf.has(l) || lf.set(l, {});
    const r = lf.get(l),
        f = JSON.stringify(i);
    return r[f] || (r[f] = new IntersectionObserver(xj, {
        root: a,
        ...i
    })), r[f]
}

function bj(a, i, l) {
    const r = vj(i);
    return Vf.set(a, l), r.observe(a), () => {
        Vf.delete(a), r.unobserve(a)
    }
}
const Sj = {
    some: 0,
    all: 1
};
class Tj extends si {
    constructor() {
        super(...arguments), this.hasEnteredView = !1, this.isInView = !1
    }
    startObserver() {
        var x;
        (x = this.stopObserver) == null || x.call(this);
        const {
            viewport: i = {}
        } = this.node.getProps(), {
            root: l,
            margin: r,
            amount: f = "some",
            once: d
        } = i, m = {
            root: l ? l.current : void 0,
            rootMargin: r,
            threshold: typeof f == "number" ? f : Sj[f]
        }, h = y => {
            const {
                isIntersecting: g
            } = y;
            if (this.isInView === g || (this.isInView = g, d && !g && this.hasEnteredView)) return;
            g && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", g);
            const {
                onViewportEnter: b,
                onViewportLeave: S
            } = this.node.getProps(), j = g ? b : S;
            j && j(y)
        };
        this.stopObserver = bj(this.node.current, m, h)
    }
    mount() {
        this.startObserver()
    }
    update() {
        if (typeof IntersectionObserver > "u") return;
        const {
            props: i,
            prevProps: l
        } = this.node;
        ["amount", "margin", "root"].some(Nj(i, l)) && this.startObserver()
    }
    unmount() {
        var i;
        (i = this.stopObserver) == null || i.call(this), this.hasEnteredView = !1, this.isInView = !1
    }
}

function Nj({
    viewport: a = {}
}, {
    viewport: i = {}
} = {}) {
    return l => a[l] !== i[l]
}
const jj = {
        inView: {
            Feature: Tj
        },
        tap: {
            Feature: gj
        },
        focus: {
            Feature: pj
        },
        hover: {
            Feature: hj
        }
    },
    Mj = {
        layout: {
            ProjectionNode: px,
            MeasureLayout: Ex
        }
    },
    wj = {
        ...FN,
        ...jj,
        ...mj,
        ...Mj
    },
    st = XN(wj, KN),
    Cx = [{
        name: "강원특별자치도",
        districts: [{
            name: "강릉시",
            areas: ["강남동", "강동면", "경포동", "교1동", "교2동", "구정면", "내곡동", "사천면", "성덕동", "성산면", "송정동", "연곡면", "옥계면", "옥천동", "왕산면", "주문진읍", "중앙동", "초당동", "포남1동", "포남2동", "홍제동"]
        }, {
            name: "고성군",
            areas: ["간성읍", "거진읍", "죽왕면", "토성면", "현내면"]
        }, {
            name: "동해시",
            areas: ["동호동", "망상동", "묵호동", "발한동", "부곡동", "북삼동", "북평동", "삼화동", "송정동", "천곡동"]
        }, {
            name: "삼척시",
            areas: ["가곡면", "교동", "근덕면", "남양동", "노곡면", "도계읍", "미로면", "성내동", "신기면", "원덕읍", "정라동", "하장면"]
        }, {
            name: "속초시",
            areas: ["교동", "금호동", "노학동", "대포동", "동명동", "영랑동", "조양동", "청호동"]
        }, {
            name: "양구군",
            areas: ["국토정중앙면", "동면", "방산면", "양구읍", "해안면"]
        }, {
            name: "양양군",
            areas: ["강현면", "서면", "손양면", "양양읍", "현남면", "현북면"]
        }, {
            name: "영월군",
            areas: ["김삿갓면", "남면", "무릉도원면", "북면", "산솔면", "상동읍", "영월읍", "주천면", "한반도면"]
        }, {
            name: "원주시",
            areas: ["개운동", "귀래면", "단계동", "단구동", "명륜1동", "명륜2동", "무실동", "문막읍", "반곡관설동", "봉산동", "부론면", "소초면", "신림면", "우산동", "원인동", "일산동", "중앙동", "지정면", "태장1동", "태장2동", "판부면", "학성동", "행구동", "호저면", "흥업면"]
        }, {
            name: "인제군",
            areas: ["기린면", "남면", "북면", "상남면", "서화면", "인제읍"]
        }, {
            name: "정선군",
            areas: ["고한읍", "남면", "북평면", "사북읍", "신동읍", "여량면", "임계면", "정선읍", "화암면"]
        }, {
            name: "철원군",
            areas: ["갈말읍", "근남면", "근북면", "김화읍", "동송읍", "서면", "철원읍"]
        }, {
            name: "춘천시",
            areas: ["강남동", "교동", "근화동", "남면", "남산면", "동내면", "동면", "동산면", "북산면", "사북면", "서면", "석사동", "소양동", "신동면", "신북읍", "신사우동", "약사명동", "조운동", "퇴계동", "효자1동", "효자2동", "효자3동", "후평1동", "후평2동", "후평3동"]
        }, {
            name: "태백시",
            areas: ["구문소동", "문곡소도동", "삼수동", "상장동", "장성동", "철암동", "황연동", "황지동"]
        }, {
            name: "평창군",
            areas: ["대관령면", "대화면", "미탄면", "방림면", "봉평면", "용평면", "진부면", "평창읍"]
        }, {
            name: "홍천군",
            areas: ["남면", "내면", "내촌면", "두촌면", "북방면", "서면", "서석면", "영귀미면", "홍천읍", "화촌면"]
        }, {
            name: "화천군",
            areas: ["간동면", "사내면", "상서면", "하남면", "화천읍"]
        }, {
            name: "횡성군",
            areas: ["갑천면", "강림면", "공근면", "둔내면", "서원면", "안흥면", "우천면", "청일면", "횡성읍"]
        }]
    }, {
        name: "경기도",
        districts: [{
            name: "가평군",
            areas: ["가평읍", "북면", "상면", "설악면", "조종면", "청평면"]
        }, {
            name: "고양시덕양구",
            areas: ["고양동", "관산동", "능곡동", "대덕동", "삼송1동", "삼송2동", "성사1동", "성사2동", "원신동", "주교동", "창릉동", "행신1동", "행신2동", "행신3동", "행신4동", "행주동", "화전동", "화정1동", "화정2동", "효자동", "흥도동"]
        }, {
            name: "고양시일산동구",
            areas: ["고봉동", "마두1동", "마두2동", "백석1동", "백석2동", "식사동", "장항1동", "장항2동", "정발산동", "중산1동", "중산2동", "풍산동"]
        }, {
            name: "고양시일산서구",
            areas: ["가좌동", "대화동", "덕이동", "송포동", "일산1동", "일산2동", "일산3동", "주엽1동", "주엽2동", "탄현1동", "탄현2동"]
        }, {
            name: "과천시",
            areas: ["갈현동", "과천동", "문원동", "별양동", "부림동", "원문동", "중앙동"]
        }, {
            name: "광명시",
            areas: ["광명1동", "광명2동", "광명3동", "광명4동", "광명5동", "광명6동", "광명7동", "소하1동", "소하2동", "일직동", "철산1동", "철산2동", "철산3동", "철산4동", "하안1동", "하안2동", "하안3동", "하안4동", "학온동"]
        }, {
            name: "광주시",
            areas: ["경안동", "곤지암읍", "광남1동", "광남2동", "남종면", "남한산성면", "능평동", "도척면", "송정동", "신현동", "쌍령동", "오포1동", "오포2동", "초월읍", "탄벌동", "퇴촌면"]
        }, {
            name: "구리시",
            areas: ["갈매동", "교문1동", "교문2동", "동구동", "수택1동", "수택2동", "수택3동", "인창동"]
        }, {
            name: "군포시",
            areas: ["광정동", "군포1동", "군포2동", "궁내동", "금정동", "대야동", "산본1동", "산본2동", "송부동", "수리동", "오금동", "재궁동"]
        }, {
            name: "김포시",
            areas: ["고촌읍", "구래동", "김포본동", "대곶면", "마산동", "사우동", "양촌읍", "운양동", "월곶면", "장기동", "장기본동", "통진읍", "풍무동", "하성면"]
        }, {
            name: "남양주시",
            areas: ["금곡동", "다산1동", "다산2동", "별내동", "별내면", "수동면", "양정동", "오남읍", "와부읍", "조안면", "진건읍", "진접읍", "퇴계원읍", "평내동", "호평동", "화도읍"]
        }, {
            name: "동두천시",
            areas: ["보산동", "불현동", "상패동", "생연1동", "생연2동", "소요동", "송내동", "중앙동"]
        }, {
            name: "부천시소사구",
            areas: ["괴안동", "범박동", "소사본1동", "소사본동", "송내1동", "송내2동", "심곡본1동", "심곡본동", "역곡3동", "옥길동"]
        }, {
            name: "부천시오정구",
            areas: ["고강1동", "고강본동", "성곡동", "신흥동", "오정동", "원종1동", "원종2동"]
        }, {
            name: "부천시원미구",
            areas: ["도당동", "상1동", "상2동", "상3동", "상동", "소사동", "심곡1동", "심곡2동", "심곡3동", "약대동", "역곡1동", "역곡2동", "원미1동", "원미2동", "중1동", "중2동", "중3동", "중4동", "중동", "춘의동"]
        }, {
            name: "성남시분당구",
            areas: ["구미1동", "구미동", "금곡동", "백현동", "분당동", "삼평동", "서현1동", "서현2동", "수내1동", "수내2동", "수내3동", "야탑1동", "야탑2동", "야탑3동", "운중동", "이매1동", "이매2동", "정자1동", "정자2동", "정자3동", "정자동", "판교동"]
        }, {
            name: "성남시수정구",
            areas: ["고등동", "단대동", "복정동", "산성동", "수진1동", "수진2동", "시흥동", "신촌동", "신흥1동", "신흥2동", "신흥3동", "양지동", "위례동", "태평1동", "태평2동", "태평3동", "태평4동"]
        }, {
            name: "성남시중원구",
            areas: ["금광1동", "금광2동", "도촌동", "상대원1동", "상대원2동", "상대원3동", "성남동", "은행1동", "은행2동", "중앙동", "하대원동"]
        }, {
            name: "수원시권선구",
            areas: ["곡선동", "구운동", "권선1동", "권선2동", "금곡동", "서둔동", "세류1동", "세류2동", "세류3동", "입북동", "평동", "호매실동"]
        }, {
            name: "수원시영통구",
            areas: ["광교1동", "광교2동", "망포1동", "망포2동", "매탄1동", "매탄2동", "매탄3동", "매탄4동", "영통1동", "영통2동", "영통3동", "원천동"]
        }, {
            name: "수원시장안구",
            areas: ["송죽동", "연무동", "영화동", "율천동", "정자1동", "정자2동", "정자3동", "조원1동", "조원2동", "파장동"]
        }, {
            name: "수원시팔달구",
            areas: ["고등동", "매교동", "매산동", "우만1동", "우만2동", "인계동", "지동", "행궁동", "화서1동", "화서2동"]
        }, {
            name: "시흥시",
            areas: ["거북섬동", "과림동", "군자동", "능곡동", "대야동", "매화동", "목감동", "배곧1동", "배곧2동", "신천동", "신현동", "연성동", "월곶동", "은행동", "장곡동", "정왕1동", "정왕2동", "정왕3동", "정왕4동", "정왕본동"]
        }, {
            name: "안산시단원구",
            areas: ["고잔동", "대부동", "백운동", "선부1동", "선부2동", "선부3동", "신길동", "와동", "원곡동", "중앙동", "초지동", "호수동"]
        }, {
            name: "안산시상록구",
            areas: ["반월동", "본오1동", "본오2동", "본오3동", "부곡동", "사동", "사이동", "성포동", "안산동", "월피동", "이동", "일동", "해양동"]
        }, {
            name: "안성시",
            areas: ["고삼면", "공도읍", "금광면", "대덕면", "미양면", "보개면", "삼죽면", "서운면", "안성1동", "안성2동", "안성3동", "양성면", "원곡면", "일죽면", "죽산면"]
        }, {
            name: "안양시동안구",
            areas: ["갈산동", "관양동", "귀인동", "달안동", "범계동", "부림동", "부흥동", "비산1동", "비산2동", "비산3동", "신촌동", "인덕원동", "평안동", "평촌동", "호계1동", "호계2동", "호계3동"]
        }, {
            name: "안양시만안구",
            areas: ["명학동", "박달동", "병목안동", "석수1동", "석수2동", "안양1동", "안양2동", "안양3동", "안양4동", "안양5동", "안양6동", "안양7동", "충훈동", "호현동"]
        }, {
            name: "양주시",
            areas: ["광적면", "남면", "백석읍", "양주1동", "양주2동", "옥정1동", "옥정2동", "은현면", "장흥면", "회천1동", "회천2동", "회천3동"]
        }, {
            name: "양평군",
            areas: ["강상면", "강하면", "개군면", "단월면", "서종면", "양동면", "양서면", "양평읍", "옥천면", "용문면", "지평면", "청운면"]
        }, {
            name: "여주시",
            areas: ["가남읍", "강천면", "금사면", "대신면", "북내면", "산북면", "세종대왕면", "여흥동", "오학동", "점동면", "중앙동", "흥천면"]
        }, {
            name: "연천군",
            areas: ["군남면", "미산면", "백학면", "신서면", "연천읍", "왕징면", "장남면", "전곡읍", "중면", "청산면"]
        }, {
            name: "오산시",
            areas: ["남촌동", "대원1동", "대원2동", "세마동", "신장1동", "신장2동", "중앙동", "초평동"]
        }, {
            name: "용인시기흥구",
            areas: ["구갈동", "구성동", "기흥동", "동백1동", "동백2동", "동백3동", "마북동", "보라동", "보정동", "상갈동", "상하동", "서농동", "신갈동", "영덕1동", "영덕2동"]
        }, {
            name: "용인시수지구",
            areas: ["동천동", "상현1동", "상현2동", "상현3동", "성복동", "신봉동", "죽전1동", "죽전2동", "죽전3동", "풍덕천1동", "풍덕천2동"]
        }, {
            name: "용인시처인구",
            areas: ["남사읍", "동부동", "모현읍", "백암면", "삼가동", "양지읍", "역북동", "원삼면", "유림1동", "유림2동", "이동읍", "중앙동", "포곡읍"]
        }, {
            name: "의왕시",
            areas: ["고천동", "내손1동", "내손2동", "부곡동", "오전동", "청계동"]
        }, {
            name: "의정부시",
            areas: ["가능동", "고산동", "녹양동", "송산1동", "송산2동", "송산3동", "신곡1동", "신곡2동", "의정부1동", "의정부2동", "자금동", "장암동", "호원1동", "호원2동", "흥선동"]
        }, {
            name: "이천시",
            areas: ["관고동", "대월면", "마장면", "모가면", "백사면", "부발읍", "설성면", "신둔면", "율면", "장호원읍", "중리동", "증포동", "창전동", "호법면"]
        }, {
            name: "파주시",
            areas: ["광탄면", "교하동", "금촌1동", "금촌2동", "금촌3동", "문산읍", "법원읍", "운정1동", "운정2동", "운정3동", "운정4동", "운정5동", "운정6동", "월롱면", "장단면", "적성면", "조리읍", "탄현면", "파주읍", "파평면"]
        }, {
            name: "평택시",
            areas: ["고덕동", "고덕면", "동삭동", "비전1동", "비전2동", "서정동", "서탄면", "세교동", "송북동", "송탄동", "신장1동", "신장2동", "신평동", "안중읍", "오성면", "용이동", "원평동", "중앙동", "지산동", "진위면", "청북읍", "통복동", "팽성읍", "포승읍", "현덕면"]
        }, {
            name: "포천시",
            areas: ["가산면", "관인면", "군내면", "내촌면", "선단동", "소흘읍", "신북면", "영북면", "영중면", "이동면", "일동면", "창수면", "포천동", "화현면"]
        }, {
            name: "하남시",
            areas: ["감북동", "감일동", "덕풍1동", "덕풍2동", "덕풍3동", "미사1동", "미사2동", "미사3동", "신장1동", "신장2동", "위례동", "천현동", "초이동", "춘궁동"]
        }, {
            name: "화성시동탄구",
            areas: ["동탄1동", "동탄2동", "동탄3동", "동탄4동", "동탄5동", "동탄6동", "동탄7동", "동탄8동", "동탄9동"]
        }, {
            name: "화성시만세구",
            areas: ["남양읍", "마도면", "새솔동", "서신면", "송산면", "양감면", "우정읍", "장안면", "팔탄면", "향남읍"]
        }, {
            name: "화성시병점구",
            areas: ["반월동", "병점1동", "병점2동", "진안동", "화산동"]
        }, {
            name: "화성시효행구",
            areas: ["기배동", "매송면", "봉담읍", "비봉면", "정남면"]
        }]
    }, {
        name: "경상남도",
        districts: [{
            name: "거제시",
            areas: ["거제면", "고현동", "남부면", "능포동", "동부면", "둔덕면", "사등면", "상문동", "수양동", "아주동", "연초면", "옥포1동", "옥포2동", "일운면", "장목면", "장승포동", "장평동", "하청면"]
        }, {
            name: "거창군",
            areas: ["가북면", "가조면", "거창읍", "고제면", "남상면", "남하면", "마리면", "북상면", "신원면", "웅양면", "위천면", "주상면"]
        }, {
            name: "고성군",
            areas: ["개천면", "거류면", "고성읍", "구만면", "대가면", "동해면", "마암면", "삼산면", "상리면", "영오면", "영현면", "하이면", "하일면", "회화면"]
        }, {
            name: "김해시",
            areas: ["내외동", "대동면", "동상동", "부원동", "북부동", "불암동", "삼안동", "상동면", "생림면", "장유1동", "장유2동", "장유3동", "주촌면", "진례면", "진영읍", "칠산서부동", "한림면", "활천동", "회현동"]
        }, {
            name: "남해군",
            areas: ["고현면", "남면", "남해읍", "미조면", "삼동면", "상주면", "서면", "설천면", "이동면", "창선면"]
        }, {
            name: "밀양시",
            areas: ["가곡동", "교동", "내이동", "내일동", "단장면", "무안면", "부북면", "산내면", "산외면", "삼랑진읍", "삼문동", "상남면", "상동면", "청도면", "초동면", "하남읍"]
        }, {
            name: "사천시",
            areas: ["곤명면", "곤양면", "남양동", "동서금동", "동서동", "벌용동", "사남면", "사천읍", "서포면", "선구동", "용현면", "정동면", "축동면", "향촌동"]
        }, {
            name: "산청군",
            areas: ["금서면", "단성면", "산청읍", "삼장면", "생비량면", "생초면", "시천면", "신등면", "신안면", "오부면", "차황면"]
        }, {
            name: "양산시",
            areas: ["강서동", "덕계동", "동면", "물금읍", "삼성동", "상북면", "서창동", "소주동", "양주동", "원동면", "중앙동", "평산동", "하북면"]
        }, {
            name: "의령군",
            areas: ["가례면", "궁류면", "낙서면", "대의면", "봉수면", "부림면", "용덕면", "유곡면", "의령읍", "정곡면", "지정면", "칠곡면", "화정면"]
        }, {
            name: "진주시",
            areas: ["가호동", "금곡면", "금산면", "내동면", "대곡면", "대평면", "명석면", "문산읍", "미천면", "사봉면", "상대동", "상봉동", "상평동", "성북동", "수곡면", "신안동", "이반성면", "이현동", "일반성면", "정촌면", "중앙동", "지수면", "진성면", "집현면", "천전동", "초장동", "충무공동", "판문동", "평거동", "하대동"]
        }, {
            name: "창녕군",
            areas: ["계성면", "고암면", "길곡면", "남지읍", "대지면", "대합면", "도천면", "부곡면", "성산면", "영산면", "유어면", "이방면", "장마면", "창녕읍"]
        }, {
            name: "창원시마산합포구",
            areas: ["가포동", "교방동", "구산면", "문화동", "반월중앙동", "산호동", "오동동", "완월동", "월영동", "자산동", "진동면", "진북면", "진전면", "합포동", "현동"]
        }, {
            name: "창원시마산회원구",
            areas: ["구암1동", "구암2동", "내서읍", "봉암동", "석전동", "양덕1동", "양덕2동", "합성1동", "합성2동", "회성동", "회원1동", "회원2동"]
        }, {
            name: "창원시성산구",
            areas: ["가음정동", "반송동", "사파동", "상남동", "성주동", "용지동", "웅남동", "중앙동"]
        }, {
            name: "창원시의창구",
            areas: ["대산면", "동읍", "명곡동", "봉림동", "북면", "의창동", "팔룡동"]
        }, {
            name: "창원시진해구",
            areas: ["경화동", "덕산동", "병암동", "석동", "여좌동", "웅동1동", "웅동2동", "웅천동", "이동", "자은동", "충무동", "태백동", "풍호동"]
        }, {
            name: "통영시",
            areas: ["광도면", "도산면", "도천동", "명정동", "무전동", "미수동", "봉평동", "북신동", "사량면", "산양읍", "욕지면", "용남면", "정량동", "중앙동", "한산면"]
        }, {
            name: "하동군",
            areas: ["고전면", "금남면", "금성면", "북천면", "악양면", "양보면", "옥종면", "적량면", "진교면", "청암면", "하동읍", "화개면", "횡천면"]
        }, {
            name: "함안군",
            areas: ["가야읍", "군북면", "대산면", "법수면", "산인면", "여항면", "칠북면", "칠서면", "칠원읍", "함안면"]
        }, {
            name: "함양군",
            areas: ["마천면", "백전면", "병곡면", "서상면", "서하면", "수동면", "안의면", "유림면", "지곡면", "함양읍", "휴천면"]
        }, {
            name: "합천군",
            areas: ["가야면", "가회면", "대병면", "대양면", "덕곡면", "묘산면", "봉산면", "삼가면", "쌍백면", "쌍책면", "야로면", "용주면", "율곡면", "적중면", "청덕면", "초계면", "합천읍"]
        }]
    }, {
        name: "경상북도",
        districts: [{
            name: "경산시",
            areas: ["남부동", "남산면", "남천면", "동부동", "북부동", "서부1동", "서부2동", "압량읍", "와촌면", "용성면", "자인면", "중방동", "중앙동", "진량읍", "하양읍"]
        }, {
            name: "경주시",
            areas: ["감포읍", "강동면", "건천읍", "내남면", "동천동", "문무대왕면", "보덕동", "불국동", "산내면", "서면", "선도동", "성건동", "안강읍", "양남면", "외동읍", "용강동", "월성동", "천북면", "현곡면", "황남동", "황성동", "황오동"]
        }, {
            name: "고령군",
            areas: ["개진면", "다산면", "대가야읍", "덕곡면", "성산면", "쌍림면", "우곡면", "운수면"]
        }, {
            name: "구미시",
            areas: ["고아읍", "공단동", "광평동", "도개면", "도량동", "무을면", "비산동", "산동읍", "상모사곡동", "선산읍", "선주원남동", "송정동", "신평1동", "신평2동", "양포동", "옥성면", "원평동", "인동동", "임오동", "장천면", "지산동", "진미동", "해평면", "형곡1동", "형곡2동"]
        }, {
            name: "김천시",
            areas: ["감문면", "감천면", "개령면", "구성면", "남면", "농소면", "대곡동", "대덕면", "대신동", "대항면", "봉산면", "부항면", "아포읍", "양금동", "어모면", "율곡동", "자산동", "조마면", "증산면", "지례면", "지좌동", "평화남산동"]
        }, {
            name: "문경시",
            areas: ["가은읍", "농암면", "동로면", "마성면", "문경읍", "산북면", "산양면", "영순면", "점촌1동", "점촌2동", "점촌3동", "점촌4동", "점촌5동", "호계면"]
        }, {
            name: "봉화군",
            areas: ["명호면", "물야면", "법전면", "봉성면", "봉화읍", "상운면", "석포면", "소천면", "재산면", "춘양면"]
        }, {
            name: "상주시",
            areas: ["계림동", "공검면", "공성면", "낙동면", "남원동", "내서면", "동문동", "동성동", "모동면", "모서면", "북문동", "사벌국면", "신흥동", "외남면", "외서면", "은척면", "이안면", "중동면", "청리면", "함창읍", "화남면", "화동면", "화북면", "화서면"]
        }, {
            name: "성주군",
            areas: ["가천면", "금수강산면", "대가면", "벽진면", "선남면", "성주읍", "수륜면", "용암면", "월항면", "초전면"]
        }, {
            name: "안동시",
            areas: ["강남동", "길안면", "남선면", "남후면", "녹전면", "도산면", "명륜동", "북후면", "서구동", "서후면", "송하동", "안기동", "예안면", "옥동", "와룡면", "용상동", "일직면", "임동면", "임하면", "중구동", "태화동", "평화동", "풍산읍", "풍천면"]
        }, {
            name: "영덕군",
            areas: ["강구면", "남정면", "달산면", "병곡면", "영덕읍", "영해면", "지품면", "창수면", "축산면"]
        }, {
            name: "영양군",
            areas: ["석보면", "수비면", "영양읍", "일월면", "입암면", "청기면"]
        }, {
            name: "영주시",
            areas: ["가흥1동", "가흥2동", "단산면", "문수면", "봉현면", "부석면", "상망동", "순흥면", "안정면", "영주1동", "영주2동", "이산면", "장수면", "평은면", "풍기읍", "하망동", "휴천1동", "휴천2동", "휴천3동"]
        }, {
            name: "영천시",
            areas: ["고경면", "금호읍", "남부동", "대창면", "동부동", "북안면", "서부동", "신녕면", "완산동", "임고면", "자양면", "중앙동", "청통면", "화남면", "화북면", "화산면"]
        }, {
            name: "예천군",
            areas: ["감천면", "개포면", "보문면", "예천읍", "용궁면", "용문면", "유천면", "은풍면", "지보면", "풍양면", "호명읍", "효자면"]
        }, {
            name: "울릉군",
            areas: ["북면", "서면", "울릉읍"]
        }, {
            name: "울진군",
            areas: ["근남면", "금강송면", "기성면", "매화면", "북면", "온정면", "울진읍", "죽변면", "평해읍", "후포면"]
        }, {
            name: "의성군",
            areas: ["가음면", "구천면", "금성면", "다인면", "단밀면", "단북면", "단촌면", "봉양면", "비안면", "사곡면", "신평면", "안계면", "안사면", "안평면", "옥산면", "의성읍", "점곡면", "춘산면"]
        }, {
            name: "청도군",
            areas: ["각남면", "각북면", "금천면", "매전면", "운문면", "이서면", "청도읍", "풍각면", "화양읍"]
        }, {
            name: "청송군",
            areas: ["부남면", "안덕면", "주왕산면", "진보면", "청송읍", "파천면", "현동면", "현서면"]
        }, {
            name: "칠곡군",
            areas: ["가산면", "기산면", "동명면", "북삼읍", "석적읍", "약목면", "왜관읍", "지천면"]
        }, {
            name: "포항시남구",
            areas: ["구룡포읍", "대송면", "대이동", "동해면", "상대동", "송도동", "연일읍", "오천읍", "장기면", "제철동", "청림동", "해도동", "호미곶면", "효곡동"]
        }, {
            name: "포항시북구",
            areas: ["기계면", "기북면", "두호동", "송라면", "신광면", "양학동", "용흥동", "우창동", "장량동", "죽도동", "죽장면", "중앙동", "청하면", "환여동", "흥해읍"]
        }]
    }, {
        name: "대구광역시",
        districts: [{
            name: "군위군",
            areas: ["군위읍", "부계면", "산성면", "삼국유사면", "소보면", "우보면", "의흥면", "효령면"]
        }, {
            name: "남구",
            areas: ["대명10동", "대명11동", "대명1동", "대명2동", "대명3동", "대명4동", "대명5동", "대명6동", "대명9동", "봉덕1동", "봉덕2동", "봉덕3동", "이천동"]
        }, {
            name: "달서구",
            areas: ["감삼동", "도원동", "두류1,2동", "두류3동", "본동", "본리동", "상인1동", "상인2동", "상인3동", "성당동", "송현1동", "송현2동", "신당동", "용산1동", "용산2동", "월성1동", "월성2동", "유천동", "이곡1동", "이곡2동", "장기동", "죽전동", "진천동"]
        }, {
            name: "달성군",
            areas: ["가창면", "구지면", "논공읍", "다사읍", "옥포읍", "유가읍", "하빈면", "현풍읍", "화원읍"]
        }, {
            name: "동구",
            areas: ["공산동", "도평동", "동촌동", "방촌동", "불로·봉무동", "신암1동", "신암2동", "신암3동", "신암4동", "신암5동", "신천1·2동", "신천3동", "신천4동", "안심1동", "안심2동", "안심3동", "안심4동", "지저동", "해안동", "혁신동", "효목1동", "효목2동"]
        }, {
            name: "북구",
            areas: ["검단동", "고성동", "관문동", "관음동", "구암동", "국우동", "노원동", "대현동", "동천동", "무태조야동", "복현1동", "복현2동", "산격1동", "산격2동", "산격3동", "산격4동", "읍내동", "칠성동", "침산1동", "침산2동", "침산3동", "태전1동", "태전2동"]
        }, {
            name: "서구",
            areas: ["내당1동", "내당2·3동", "내당4동", "비산1동", "비산2·3동", "비산4동", "비산5동", "비산6동", "비산7동", "상중이동", "원대동", "평리1동", "평리2동", "평리3동", "평리4동", "평리5동", "평리6동"]
        }, {
            name: "수성구",
            areas: ["고산1동", "고산2동", "고산3동", "두산동", "만촌1동", "만촌2동", "만촌3동", "범물1동", "범물2동", "범어1동", "범어2동", "범어3동", "범어4동", "상동", "수성1가동", "수성2·3가동", "수성4가동", "중동", "지산1동", "지산2동", "파동", "황금1동", "황금2동"]
        }, {
            name: "중구",
            areas: ["남산1동", "남산2동", "남산3동", "남산4동", "대봉1동", "대봉2동", "대신동", "동인동", "삼덕동", "성내1동", "성내2동", "성내3동"]
        }]
    }, {
        name: "대전광역시",
        districts: [{
            name: "대덕구",
            areas: ["대화동", "덕암동", "목상동", "법1동", "법2동", "비래동", "석봉동", "송촌동", "신탄진동", "오정동", "중리동", "회덕동"]
        }, {
            name: "동구",
            areas: ["가양1동", "가양2동", "대동", "대청동", "산내동", "삼성동", "성남동", "신인동", "용운동", "용전동", "자양동", "중앙동", "판암1동", "판암2동", "홍도동", "효동"]
        }, {
            name: "서구",
            areas: ["가수원동", "가장동", "갈마1동", "갈마2동", "관저1동", "관저2동", "괴정동", "기성동", "내동", "도마1동", "도마2동", "도안동", "둔산1동", "둔산2동", "둔산3동", "만년동", "변동", "복수동", "용문동", "월평1동", "월평2동", "월평3동", "정림동", "탄방동"]
        }, {
            name: "유성구",
            areas: ["관평동", "구즉동", "노은1동", "노은2동", "노은3동", "상대동", "신성동", "온천1동", "온천2동", "원신흥동", "전민동", "진잠동", "학하동"]
        }, {
            name: "중구",
            areas: ["대사동", "대흥동", "목동", "문창동", "문화1동", "문화2동", "부사동", "산성동", "석교동", "오류동", "용두동", "유천1동", "유천2동", "은행선화동", "중촌동", "태평1동", "태평2동"]
        }]
    }, {
        name: "부산광역시",
        districts: [{
            name: "강서구",
            areas: ["가덕도동", "가락동", "강동동", "녹산동", "대저1동", "대저2동", "명지1동", "명지2동", "신호동"]
        }, {
            name: "금정구",
            areas: ["구서1동", "구서2동", "금사회동동", "금성동", "남산동", "부곡1동", "부곡2동", "부곡3동", "부곡4동", "서1동", "서2동", "서3동", "선두구동", "장전1동", "장전2동", "청룡노포동"]
        }, {
            name: "기장군",
            areas: ["기장읍", "일광읍", "장안읍", "정관읍", "철마면"]
        }, {
            name: "남구",
            areas: ["감만1동", "감만2동", "대연1동", "대연3동", "대연4동", "대연5동", "대연6동", "문현1동", "문현2동", "문현3동", "문현4동", "용당동", "용호1동", "용호2동", "용호3동", "용호4동", "우암동"]
        }, {
            name: "동구",
            areas: ["범일1동", "범일2동", "범일5동", "수정1동", "수정2동", "수정4동", "수정5동", "좌천동", "초량1동", "초량2동", "초량3동", "초량6동"]
        }, {
            name: "동래구",
            areas: ["명륜동", "명장1동", "명장2동", "복산동", "사직1동", "사직2동", "사직3동", "수민동", "안락1동", "안락2동", "온천1동", "온천2동", "온천3동"]
        }, {
            name: "부산진구",
            areas: ["가야2동", "가야제1동", "개금1동", "개금2동", "개금3동", "당감1동", "당감2동", "당감4동", "범천1동", "범천2동", "부암1동", "부암3동", "부전1동", "부전2동", "양정1동", "양정2동", "연지동", "전포1동", "전포2동", "초읍동"]
        }, {
            name: "북구",
            areas: ["구포1동", "구포2동", "구포3동", "금곡동", "덕천1동", "덕천2동", "덕천3동", "만덕1동", "만덕2동", "만덕3동", "화명1동", "화명2동", "화명3동"]
        }, {
            name: "사상구",
            areas: ["감전동", "괘법동", "덕포1동", "덕포2동", "모라1동", "모라3동", "삼락동", "엄궁동", "주례1동", "주례2동", "주례3동", "학장동"]
        }, {
            name: "사하구",
            areas: ["감천1동", "감천2동", "괴정1동", "괴정2동", "괴정3동", "괴정4동", "구평동", "다대1동", "다대2동", "당리동", "신평1동", "신평2동", "장림1동", "장림2동", "하단1동", "하단2동"]
        }, {
            name: "서구",
            areas: ["남부민1동", "남부민2동", "동대신1동", "동대신2동", "동대신3동", "부민동", "서대신1동", "서대신3동", "서대신4동", "아미동", "암남동", "초장동", "충무동"]
        }, {
            name: "수영구",
            areas: ["광안1동", "광안2동", "광안3동", "광안4동", "남천1동", "남천2동", "망미1동", "망미2동", "민락동", "수영동"]
        }, {
            name: "연제구",
            areas: ["거제1동", "거제2동", "거제3동", "거제4동", "연산1동", "연산2동", "연산3동", "연산4동", "연산5동", "연산6동", "연산8동", "연산9동"]
        }, {
            name: "영도구",
            areas: ["남항동", "동삼1동", "동삼2동", "동삼3동", "봉래1동", "봉래2동", "신선동", "영선1동", "영선2동", "청학1동", "청학2동"]
        }, {
            name: "중구",
            areas: ["광복동", "남포동", "대청동", "동광동", "보수동", "부평동", "영주1동", "영주2동", "중앙동"]
        }, {
            name: "해운대구",
            areas: ["반송1동", "반송2동", "반여1동", "반여2동", "반여3동", "반여4동", "송정동", "우1동", "우2동", "우3동", "재송1동", "재송2동", "좌1동", "좌2동", "좌3동", "좌4동", "중1동", "중2동"]
        }]
    }, {
        name: "서울특별시",
        districts: [{
            name: "강남구",
            areas: ["개포1동", "개포2동", "개포3동", "개포4동", "논현1동", "논현2동", "대치1동", "대치2동", "대치4동", "도곡1동", "도곡2동", "삼성1동", "삼성2동", "세곡동", "수서동", "신사동", "압구정동", "역삼1동", "역삼2동", "일원1동", "일원본동", "청담동"]
        }, {
            name: "강동구",
            areas: ["강일동", "고덕1동", "고덕2동", "길동", "둔촌1동", "둔촌2동", "명일1동", "명일2동", "상일제1동", "상일제2동", "성내1동", "성내2동", "성내3동", "암사1동", "암사2동", "암사3동", "천호1동", "천호2동", "천호3동"]
        }, {
            name: "강북구",
            areas: ["미아동", "번1동", "번2동", "번3동", "삼각산동", "삼양동", "송중동", "송천동", "수유1동", "수유2동", "수유3동", "우이동", "인수동"]
        }, {
            name: "강서구",
            areas: ["가양1동", "가양2동", "가양3동", "공항동", "등촌1동", "등촌2동", "등촌3동", "발산1동", "방화1동", "방화2동", "방화3동", "염창동", "우장산동", "화곡1동", "화곡2동", "화곡3동", "화곡4동", "화곡6동", "화곡8동", "화곡본동"]
        }, {
            name: "관악구",
            areas: ["낙성대동", "난곡동", "난향동", "남현동", "대학동", "미성동", "보라매동", "삼성동", "서림동", "서원동", "성현동", "신림동", "신사동", "신원동", "은천동", "인헌동", "조원동", "중앙동", "청룡동", "청림동", "행운동"]
        }, {
            name: "광진구",
            areas: ["광장동", "구의1동", "구의2동", "구의3동", "군자동", "능동", "자양1동", "자양2동", "자양3동", "자양4동", "중곡1동", "중곡2동", "중곡3동", "중곡4동", "화양동"]
        }, {
            name: "구로구",
            areas: ["가리봉동", "개봉1동", "개봉2동", "개봉3동", "고척1동", "고척2동", "구로1동", "구로2동", "구로3동", "구로4동", "구로5동", "수궁동", "신도림동", "오류1동", "오류2동", "항동"]
        }, {
            name: "금천구",
            areas: ["가산동", "독산1동", "독산2동", "독산3동", "독산4동", "시흥1동", "시흥2동", "시흥3동", "시흥4동", "시흥5동"]
        }, {
            name: "노원구",
            areas: ["공릉1동", "공릉2동", "상계10동", "상계1동", "상계2동", "상계3·4동", "상계5동", "상계6·7동", "상계8동", "상계9동", "월계1동", "월계2동", "월계3동", "중계1동", "중계2·3동", "중계4동", "중계본동", "하계1동", "하계2동"]
        }, {
            name: "도봉구",
            areas: ["도봉1동", "도봉2동", "방학1동", "방학2동", "방학3동", "쌍문1동", "쌍문2동", "쌍문3동", "쌍문4동", "창1동", "창2동", "창3동", "창4동", "창5동"]
        }, {
            name: "동대문구",
            areas: ["답십리1동", "답십리2동", "신설동", "용두동", "이문1동", "이문2동", "장안1동", "장안2동", "전농1동", "전농2동", "제기동", "청량리동", "회기동", "휘경1동", "휘경2동"]
        }, {
            name: "동작구",
            areas: ["노량진1동", "노량진2동", "대방동", "사당1동", "사당2동", "사당3동", "사당4동", "사당5동", "상도1동", "상도2동", "상도3동", "상도4동", "신대방1동", "신대방2동", "흑석동"]
        }, {
            name: "마포구",
            areas: ["공덕동", "대흥동", "도화동", "망원1동", "망원2동", "상암동", "서강동", "서교동", "성산1동", "성산2동", "신수동", "아현동", "연남동", "염리동", "용강동", "합정동"]
        }, {
            name: "서대문구",
            areas: ["남가좌1동", "남가좌2동", "북가좌1동", "북가좌2동", "북아현동", "신촌동", "연희동", "천연동", "충현동", "홍은1동", "홍은2동", "홍제1동", "홍제2동", "홍제3동"]
        }, {
            name: "서초구",
            areas: ["내곡동", "반포1동", "반포2동", "반포3동", "반포4동", "반포본동", "방배1동", "방배2동", "방배3동", "방배4동", "방배본동", "서초1동", "서초2동", "서초3동", "서초4동", "양재1동", "양재2동", "잠원동"]
        }, {
            name: "성동구",
            areas: ["금호1가동", "금호2·3가동", "금호4가동", "마장동", "사근동", "성수1가1동", "성수1가2동", "성수2가1동", "성수2가3동", "송정동", "옥수동", "왕십리2동", "왕십리도선동", "용답동", "응봉동", "행당1동", "행당2동"]
        }, {
            name: "성북구",
            areas: ["길음1동", "길음2동", "돈암1동", "돈암2동", "동선동", "보문동", "삼선동", "석관동", "성북동", "안암동", "월곡1동", "월곡2동", "장위1동", "장위2동", "장위3동", "정릉1동", "정릉2동", "정릉3동", "정릉4동", "종암동"]
        }, {
            name: "송파구",
            areas: ["가락1동", "가락2동", "가락본동", "거여1동", "거여2동", "마천1동", "마천2동", "문정1동", "문정2동", "방이1동", "방이2동", "삼전동", "석촌동", "송파1동", "송파2동", "오금동", "오륜동", "위례동", "잠실2동", "잠실3동", "잠실4동", "잠실6동", "잠실7동", "잠실본동", "장지동", "풍납1동", "풍납2동"]
        }, {
            name: "양천구",
            areas: ["목1동", "목2동", "목3동", "목4동", "목5동", "신월1동", "신월2동", "신월3동", "신월4동", "신월5동", "신월6동", "신월7동", "신정1동", "신정2동", "신정3동", "신정4동", "신정6동", "신정7동"]
        }, {
            name: "영등포구",
            areas: ["당산1동", "당산2동", "대림1동", "대림2동", "대림3동", "도림동", "문래동", "신길1동", "신길3동", "신길4동", "신길5동", "신길6동", "신길7동", "양평1동", "양평2동", "여의동", "영등포동", "영등포본동"]
        }, {
            name: "용산구",
            areas: ["남영동", "보광동", "서빙고동", "용문동", "용산2가동", "원효로1동", "원효로2동", "이촌1동", "이촌2동", "이태원1동", "이태원2동", "청파동", "한강로동", "한남동", "효창동", "후암동"]
        }, {
            name: "은평구",
            areas: ["갈현1동", "갈현2동", "구산동", "녹번동", "대조동", "불광1동", "불광2동", "수색동", "신사1동", "신사2동", "역촌동", "응암1동", "응암2동", "응암3동", "증산동", "진관동"]
        }, {
            name: "종로구",
            areas: ["가회동", "교남동", "무악동", "부암동", "사직동", "삼청동", "숭인1동", "숭인2동", "이화동", "종로1·2·3·4가동", "종로5·6가동", "창신1동", "창신2동", "창신3동", "청운효자동", "평창동", "혜화동"]
        }, {
            name: "중구",
            areas: ["광희동", "다산동", "동화동", "명동", "소공동", "신당5동", "신당동", "약수동", "을지로동", "장충동", "중림동", "청구동", "필동", "황학동", "회현동"]
        }, {
            name: "중랑구",
            areas: ["망우3동", "망우본동", "면목2동", "면목3·8동", "면목4동", "면목5동", "면목7동", "면목본동", "묵1동", "묵2동", "상봉1동", "상봉2동", "신내1동", "신내2동", "중화1동", "중화2동"]
        }]
    }, {
        name: "세종특별자치시",
        districts: [{
            name: "세종시",
            areas: ["고운동", "금남면", "나성동", "다정동", "대평동", "도담동", "반곡동", "보람동", "부강면", "새롬동", "소담동", "소정면", "아름동", "어진동", "연기면", "연동면", "연서면", "장군면", "전동면", "전의면", "조치원읍", "종촌동", "한솔동", "해밀동"]
        }]
    }, {
        name: "울산광역시",
        districts: [{
            name: "남구",
            areas: ["달동", "대현동", "무거동", "삼산동", "삼호동", "선암동", "수암동", "신정1동", "신정2동", "신정3동", "신정4동", "신정5동", "야음장생포동", "옥동"]
        }, {
            name: "동구",
            areas: ["남목1동", "남목2동", "남목3동", "대송동", "방어동", "일산동", "전하1동", "전하2동", "화정동"]
        }, {
            name: "북구",
            areas: ["강동동", "농소1동", "농소2동", "농소3동", "송정동", "양정동", "염포동", "효문동"]
        }, {
            name: "울주군",
            areas: ["두동면", "두서면", "범서읍", "삼남읍", "삼동면", "상북면", "서생면", "언양읍", "온산읍", "온양읍", "웅촌면", "청량읍"]
        }, {
            name: "중구",
            areas: ["다운동", "반구1동", "반구2동", "병영1동", "병영2동", "복산동", "성안동", "약사동", "우정동", "중앙동", "태화동", "학성동"]
        }]
    }, {
        name: "인천광역시",
        districts: [{
            name: "강화군",
            areas: ["강화읍", "교동면", "길상면", "내가면", "불은면", "삼산면", "서도면", "선원면", "송해면", "양도면", "양사면", "하점면", "화도면"]
        }, {
            name: "검단구",
            areas: ["검단동", "당하동", "마전동", "불로대곡동", "아라1동", "아라2동", "오류왕길동", "원당동"]
        }, {
            name: "계양구",
            areas: ["계산1동", "계산2동", "계산3동", "계산4동", "계양1동", "계양2동", "계양3동", "작전1동", "작전2동", "작전서운동", "효성1동", "효성2동"]
        }, {
            name: "남동구",
            areas: ["간석1동", "간석2동", "간석3동", "간석4동", "구월1동", "구월2동", "구월3동", "구월4동", "남촌도림동", "논현1동", "논현2동", "논현고잔동", "만수1동", "만수2동", "만수3동", "만수4동", "만수5동", "만수6동", "서창2동", "장수서창동"]
        }, {
            name: "미추홀구",
            areas: ["관교동", "도화1동", "도화2·3동", "문학동", "숭의1·3동", "숭의2동", "숭의4동", "용현1·4동", "용현2동", "용현3동", "용현5동", "주안1동", "주안2동", "주안3동", "주안4동", "주안5동", "주안6동", "주안7동", "주안8동", "학익1동", "학익2동"]
        }, {
            name: "부평구",
            areas: ["갈산1동", "갈산2동", "부개1동", "부개2동", "부개3동", "부평1동", "부평2동", "부평3동", "부평4동", "부평5동", "부평6동", "산곡1동", "산곡2동", "산곡3동", "산곡4동", "삼산1동", "삼산2동", "십정1동", "십정2동", "일신동", "청천1동", "청천2동"]
        }, {
            name: "서해구",
            areas: ["가정1동", "가정2동", "가정3동", "가좌1동", "가좌2동", "가좌3동", "가좌4동", "검암경서동", "석남1동", "석남2동", "석남3동", "신현원창동", "연희동", "청라1동", "청라2동", "청라3동"]
        }, {
            name: "연수구",
            areas: ["동춘1동", "동춘2동", "동춘3동", "선학동", "송도1동", "송도2동", "송도3동", "송도4동", "송도5동", "연수1동", "연수2동", "연수3동", "옥련1동", "옥련2동", "청학동"]
        }, {
            name: "영종구",
            areas: ["영종1동", "영종2동", "영종동", "용유동", "운서1동", "운서2동"]
        }, {
            name: "옹진군",
            areas: ["대청면", "덕적면", "백령면", "북도면", "연평면", "영흥면", "자월면"]
        }, {
            name: "제물포구",
            areas: ["개항동", "금창동", "도원동", "동인천동", "만석동", "송림1동", "송림2동", "송림3·5동", "송림4동", "송림6동", "송현1·2동", "송현3동", "신포동", "신흥동", "연안동", "율목동", "화수1·화평동", "화수2동"]
        }]
    }, {
        name: "전남광주통합특별시",
        districts: [{
            name: "강진군",
            areas: ["강진읍", "군동면", "대구면", "도암면", "마량면", "병영면", "성전면", "신전면", "옴천면", "작천면", "칠량면"]
        }, {
            name: "고흥군",
            areas: ["고흥읍", "과역면", "금산면", "남양면", "대서면", "도덕면", "도양읍", "도화면", "동강면", "동일면", "두원면", "봉래면", "영남면", "점암면", "포두면", "풍양면"]
        }, {
            name: "곡성군",
            areas: ["겸면", "고달면", "곡성읍", "목사동면", "삼기면", "석곡면", "오곡면", "오산면", "옥과면", "입면", "죽곡면"]
        }, {
            name: "광산구",
            areas: ["도산동", "동곡동", "본량동", "비아동", "삼도동", "송정1동", "송정2동", "수완동", "신가동", "신창동", "신흥동", "어룡동", "우산동", "운남동", "월곡1동", "월곡2동", "임곡동", "첨단1동", "첨단2동", "평동", "하남동"]
        }, {
            name: "광양시",
            areas: ["골약동", "광양읍", "광영동", "금호동", "다압면", "봉강면", "옥곡면", "옥룡면", "중마동", "진상면", "진월면", "태인동"]
        }, {
            name: "구례군",
            areas: ["간전면", "광의면", "구례읍", "마산면", "문척면", "산동면", "용방면", "토지면"]
        }, {
            name: "나주시",
            areas: ["공산면", "금남동", "금천면", "남평읍", "노안면", "다도면", "다시면", "동강면", "문평면", "반남면", "봉황면", "빛가람동", "산포면", "성북동", "세지면", "송월동", "영강동", "영산동", "왕곡면", "이창동"]
        }, {
            name: "남구",
            areas: ["대촌동", "방림1동", "방림2동", "백운1동", "백운2동", "봉선1동", "봉선2동", "사직동", "송암동", "양림동", "월산4동", "월산5동", "월산동", "주월1동", "주월2동", "진월동", "효덕동"]
        }, {
            name: "담양군",
            areas: ["가사문학면", "고서면", "금성면", "담양읍", "대덕면", "대전면", "무정면", "봉산면", "수북면", "용면", "월산면", "창평면"]
        }, {
            name: "동구",
            areas: ["계림1동", "계림2동", "동명동", "산수1동", "산수2동", "서남동", "지산1동", "지산2동", "지원1동", "지원2동", "충장동", "학동", "학운동"]
        }, {
            name: "목포시",
            areas: ["대성동", "동명동", "만호동", "목원동", "부주동", "부흥동", "북항동", "산정동", "삼학동", "삼향동", "상동", "신흥동", "연동", "연산동", "옥암동", "용당1동", "용당2동", "용해동", "원산동", "유달동", "이로동", "죽교동", "하당동"]
        }, {
            name: "무안군",
            areas: ["망운면", "몽탄면", "무안읍", "삼향읍", "운남면", "일로읍", "청계면", "해제면", "현경면"]
        }, {
            name: "보성군",
            areas: ["겸백면", "노동면", "득량면", "문덕면", "미력면", "벌교읍", "보성읍", "복내면", "웅치면", "율어면", "조성면", "회천면"]
        }, {
            name: "북구",
            areas: ["건국동", "동림동", "두암1동", "두암2동", "두암3동", "매곡동", "문화동", "문흥1동", "문흥2동", "삼각동", "석곡동", "신안동", "신용동", "양산동", "오치1동", "오치2동", "용봉동", "우산동", "운암1동", "운암2동", "운암3동", "일곡동", "임동", "중앙동", "중흥1동", "중흥동", "풍향동"]
        }, {
            name: "서구",
            areas: ["광천동", "금호1동", "금호2동", "농성1동", "농성2동", "동천동", "상무1동", "상무2동", "서창동", "양3동", "양동", "유덕동", "치평동", "풍암동", "화정1동", "화정2동", "화정3동", "화정4동"]
        }, {
            name: "순천시",
            areas: ["낙안면", "남제동", "덕연동", "도사동", "매곡동", "별량면", "삼산동", "상사면", "서면", "송광면", "승주읍", "왕조1동", "왕조2동", "외서면", "월등면", "장천동", "저전동", "조곡동", "주암면", "중앙동", "풍덕동", "해룡면", "향동", "황전면"]
        }, {
            name: "신안군",
            areas: ["도초면", "비금면", "신의면", "안좌면", "암태면", "압해읍", "임자면", "자은면", "장산면", "증도면", "지도읍", "팔금면", "하의면", "흑산면"]
        }, {
            name: "여수시",
            areas: ["광림동", "국동", "남면", "대교동", "돌산읍", "동문동", "둔덕동", "만덕동", "묘도동", "문수동", "미평동", "삼산면", "삼일동", "서강동", "소라면", "시전동", "쌍봉동", "여서동", "여천동", "월호동", "율촌면", "주삼동", "중앙동", "충무동", "한려동", "화양면", "화정면"]
        }, {
            name: "영광군",
            areas: ["군남면", "군서면", "낙월면", "대마면", "묘량면", "백수읍", "법성면", "불갑면", "염산면", "영광읍", "홍농읍"]
        }, {
            name: "영암군",
            areas: ["군서면", "금정면", "덕진면", "도포면", "미암면", "삼호읍", "서호면", "시종면", "신북면", "영암읍", "학산면"]
        }, {
            name: "완도군",
            areas: ["고금면", "군외면", "금당면", "금일읍", "노화읍", "보길면", "생일면", "소안면", "신지면", "약산면", "완도읍", "청산면"]
        }, {
            name: "장성군",
            areas: ["남면", "동화면", "북이면", "북일면", "북하면", "삼계면", "삼서면", "서삼면", "장성읍", "진원면", "황룡면"]
        }, {
            name: "장흥군",
            areas: ["관산읍", "대덕읍", "부산면", "안양면", "용산면", "유치면", "장동면", "장평면", "장흥읍", "회진면"]
        }, {
            name: "진도군",
            areas: ["고군면", "군내면", "의신면", "임회면", "조도면", "지산면", "진도읍"]
        }, {
            name: "함평군",
            areas: ["나산면", "대동면", "손불면", "신광면", "엄다면", "월야면", "학교면", "함평읍", "해보면"]
        }, {
            name: "해남군",
            areas: ["계곡면", "마산면", "문내면", "북일면", "북평면", "산이면", "삼산면", "송지면", "옥천면", "해남읍", "현산면", "화산면", "화원면", "황산면"]
        }, {
            name: "화순군",
            areas: ["능주면", "도곡면", "도암면", "동면", "동복면", "백아면", "사평면", "이서면", "이양면", "청풍면", "춘양면", "한천면", "화순읍"]
        }]
    }, {
        name: "전북특별자치도",
        districts: [{
            name: "고창군",
            areas: ["고수면", "고창읍", "공음면", "대산면", "무장면", "부안면", "상하면", "성내면", "성송면", "신림면", "심원면", "아산면", "해리면", "흥덕면"]
        }, {
            name: "군산시",
            areas: ["개정동", "개정면", "경암동", "구암동", "나운1동", "나운2동", "나운3동", "나포면", "대야면", "미성동", "삼학동", "서수면", "성산면", "소룡동", "수송동", "신풍동", "옥구읍", "옥도면", "옥산면", "옥서면", "월명동", "임피면", "조촌동", "중앙동", "해신동", "회현면", "흥남동"]
        }, {
            name: "김제시",
            areas: ["검산동", "공덕면", "광활면", "교월동", "금구면", "금산면", "만경읍", "백구면", "백산면", "봉남면", "부량면", "성덕면", "신풍동", "요촌동", "용지면", "죽산면", "진봉면", "청하면", "황산면"]
        }, {
            name: "남원시",
            areas: ["금동", "금지면", "노암동", "대강면", "대산면", "덕과면", "도통동", "동충동", "보절면", "사매면", "산내면", "산동면", "송동면", "수지면", "아영면", "왕정동", "운봉읍", "이백면", "인월면", "주생면", "주천면", "죽항동", "향교동"]
        }, {
            name: "무주군",
            areas: ["무주읍", "무풍면", "부남면", "설천면", "안성면", "적상면"]
        }, {
            name: "부안군",
            areas: ["계화면", "동진면", "백산면", "변산면", "보안면", "부안읍", "상서면", "위도면", "주산면", "줄포면", "진서면", "하서면", "행안면"]
        }, {
            name: "순창군",
            areas: ["구림면", "금과면", "동계면", "복흥면", "순창읍", "쌍치면", "유등면", "인계면", "적성면", "팔덕면", "풍산면"]
        }, {
            name: "완주군",
            areas: ["경천면", "고산면", "구이면", "동상면", "봉동읍", "비봉면", "삼례읍", "상관면", "소양면", "용진읍", "운주면", "이서면", "화산면"]
        }, {
            name: "익산시",
            areas: ["금마면", "남중동", "낭산면", "동산동", "마동", "망성면", "모현동", "삼기면", "삼성동", "성당면", "송학동", "신동", "어양동", "여산면", "영등1동", "영등2동", "오산면", "왕궁면", "용동면", "용안면", "웅포면", "인화동", "중앙동", "춘포면", "팔봉동", "평화동", "함라면", "함열읍", "황등면"]
        }, {
            name: "임실군",
            areas: ["강진면", "관촌면", "덕치면", "삼계면", "성수면", "신덕면", "신평면", "오수면", "운암면", "임실읍", "지사면", "청웅면"]
        }, {
            name: "장수군",
            areas: ["계남면", "계북면", "번암면", "산서면", "장계면", "장수읍", "천천면"]
        }, {
            name: "전주시덕진구",
            areas: ["금암동", "덕진동", "송천1동", "송천2동", "송천3동", "여의동", "우아1동", "우아2동", "인후1동", "인후2동", "인후3동", "조촌동", "진북동", "팔복동", "혁신동", "호성동"]
        }, {
            name: "전주시완산구",
            areas: ["노송동", "동서학동", "삼천1동", "삼천2동", "삼천3동", "서서학동", "서신동", "완산동", "중앙동", "중화산1동", "중화산2동", "평화1동", "평화2동", "풍남동", "효자1동", "효자2동", "효자3동", "효자4동", "효자5동"]
        }, {
            name: "정읍시",
            areas: ["감곡면", "고부면", "내장상동", "농소동", "덕천면", "북면", "산내면", "산외면", "상교동", "소성면", "수성동", "시기동", "신태인읍", "연지동", "영원면", "옹동면", "이평면", "입암면", "장명동", "정우면", "초산동", "칠보면", "태인면"]
        }, {
            name: "진안군",
            areas: ["동향면", "마령면", "백운면", "부귀면", "상전면", "성수면", "안천면", "용담면", "정천면", "주천면", "진안읍"]
        }]
    }, {
        name: "제주특별자치도",
        districts: [{
            name: "서귀포시",
            areas: ["남원읍", "대륜동", "대정읍", "대천동", "동홍동", "서홍동", "성산읍", "송산동", "안덕면", "영천동", "예래동", "정방동", "중문동", "중앙동", "천지동", "표선면", "효돈동"]
        }, {
            name: "제주시",
            areas: ["건입동", "구좌읍", "노형동", "도두동", "봉개동", "삼도1동", "삼도2동", "삼양동", "아라동", "애월읍", "연동", "오라동", "외도동", "용담1동", "용담2동", "우도면", "이도1동", "이도2동", "이호동", "일도1동", "일도2동", "조천읍", "추자면", "한경면", "한림읍", "화북동"]
        }]
    }, {
        name: "충청남도",
        districts: [{
            name: "계룡시",
            areas: ["금암동", "두마면", "신도안면", "엄사면"]
        }, {
            name: "공주시",
            areas: ["계룡면", "금학동", "반포면", "사곡면", "신관동", "신풍면", "옥룡동", "우성면", "웅진동", "월송동", "유구읍", "의당면", "이인면", "정안면", "중학동", "탄천면"]
        }, {
            name: "금산군",
            areas: ["군북면", "금산읍", "금성면", "남이면", "남일면", "복수면", "부리면", "제원면", "진산면", "추부면"]
        }, {
            name: "논산시",
            areas: ["가야곡면", "강경읍", "광석면", "노성면", "벌곡면", "부적면", "부창동", "상월면", "성동면", "양촌면", "연무읍", "연산면", "은진면", "채운면", "취암동"]
        }, {
            name: "당진시",
            areas: ["고대면", "당진1동", "당진2동", "당진3동", "대호지면", "면천면", "석문면", "송산면", "송악읍", "순성면", "신평면", "우강면", "정미면", "합덕읍"]
        }, {
            name: "보령시",
            areas: ["남포면", "대천1동", "대천2동", "대천3동", "대천4동", "대천5동", "미산면", "성주면", "오천면", "웅천읍", "주교면", "주산면", "주포면", "천북면", "청라면", "청소면"]
        }, {
            name: "부여군",
            areas: ["구룡면", "규암면", "남면", "내산면", "부여읍", "석성면", "세도면", "양화면", "옥산면", "외산면", "은산면", "임천면", "장암면", "초촌면", "충화면", "홍산면"]
        }, {
            name: "서산시",
            areas: ["고북면", "대산읍", "동문1동", "동문2동", "부석면", "부춘동", "석남동", "성연면", "수석동", "운산면", "음암면", "인지면", "지곡면", "팔봉면", "해미면"]
        }, {
            name: "서천군",
            areas: ["기산면", "마산면", "마서면", "문산면", "비인면", "서면", "서천읍", "시초면", "장항읍", "종천면", "판교면", "한산면", "화양면"]
        }, {
            name: "아산시",
            areas: ["도고면", "둔포면", "배방읍", "선장면", "송악면", "신창면", "염치읍", "영인면", "온양1동", "온양2동", "온양3동", "온양4동", "온양5동", "온양6동", "음봉면", "인주면", "탕정면"]
        }, {
            name: "예산군",
            areas: ["고덕면", "광시면", "대술면", "대흥면", "덕산면", "봉산면", "삽교읍", "신암면", "신양면", "예산읍", "오가면", "응봉면"]
        }, {
            name: "천안시동남구",
            areas: ["광덕면", "동면", "목천읍", "문성동", "병천면", "봉명동", "북면", "성남면", "수신면", "신방동", "신안동", "원성1동", "원성2동", "일봉동", "중앙동", "청룡동", "풍세면"]
        }, {
            name: "천안시서북구",
            areas: ["백석동", "부성1동", "부성2동", "불당1동", "불당2동", "성거읍", "성정1동", "성정2동", "성환읍", "쌍용1동", "쌍용2동", "쌍용3동", "입장면", "직산읍"]
        }, {
            name: "청양군",
            areas: ["남양면", "대치면", "목면", "비봉면", "운곡면", "장평면", "정산면", "청남면", "청양읍", "화성면"]
        }, {
            name: "태안군",
            areas: ["고남면", "근흥면", "남면", "소원면", "안면읍", "원북면", "이원면", "태안읍"]
        }, {
            name: "홍성군",
            areas: ["갈산면", "결성면", "광천읍", "구항면", "금마면", "서부면", "은하면", "장곡면", "홍동면", "홍북읍", "홍성읍"]
        }]
    }, {
        name: "충청북도",
        districts: [{
            name: "괴산군",
            areas: ["감물면", "괴산읍", "문광면", "불정면", "사리면", "소수면", "연풍면", "장연면", "청안면", "청천면", "칠성면"]
        }, {
            name: "단양군",
            areas: ["가곡면", "단성면", "단양읍", "대강면", "매포읍", "어상천면", "영춘면", "적성면"]
        }, {
            name: "보은군",
            areas: ["내북면", "마로면", "보은읍", "산외면", "삼승면", "속리산면", "수한면", "장안면", "탄부면", "회남면", "회인면"]
        }, {
            name: "영동군",
            areas: ["매곡면", "상촌면", "심천면", "양강면", "양산면", "영동읍", "용산면", "용화면", "추풍령면", "학산면", "황간면"]
        }, {
            name: "옥천군",
            areas: ["군북면", "군서면", "동이면", "안남면", "안내면", "옥천읍", "이원면", "청산면", "청성면"]
        }, {
            name: "음성군",
            areas: ["감곡면", "금왕읍", "대소읍", "맹동면", "삼성면", "생극면", "소이면", "원남면", "음성읍"]
        }, {
            name: "제천시",
            areas: ["교동", "금성면", "남현동", "덕산면", "백운면", "봉양읍", "송학면", "수산면", "신백동", "영서동", "용두동", "의림지동", "중앙동", "청전동", "청풍면", "한수면", "화산동"]
        }, {
            name: "증평군",
            areas: ["도안면", "증평읍"]
        }, {
            name: "진천군",
            areas: ["광혜원면", "덕산읍", "문백면", "백곡면", "이월면", "진천읍", "초평면"]
        }, {
            name: "청주시상당구",
            areas: ["가덕면", "금천동", "남일면", "낭성면", "문의면", "미원면", "성안동", "영운동", "용담·명암·산성동", "용암1동", "용암2동", "중앙동", "탑·대성동"]
        }, {
            name: "청주시서원구",
            areas: ["남이면", "모충동", "분평동", "사직1동", "사직2동", "사창동", "산남동", "성화·개신·죽림동", "수곡1동", "수곡2동", "현도면"]
        }, {
            name: "청주시청원구",
            areas: ["내덕1동", "내덕2동", "내수읍", "북이면", "오근장동", "오창읍", "우암동", "율량·사천동"]
        }, {
            name: "청주시흥덕구",
            areas: ["가경동", "강내면", "강서1동", "강서2동", "복대1동", "복대2동", "봉명1동", "봉명2·송정동", "오송읍", "옥산면", "운천·신봉동"]
        }, {
            name: "충주시",
            areas: ["교현·안림동", "교현2동", "금가면", "노은면", "달천동", "대소원면", "동량면", "목행·용탄동", "문화동", "봉방동", "산척면", "살미면", "성내·충인동", "소태면", "수안보면", "신니면", "앙성면", "엄정면", "연수동", "용산동", "주덕읍", "중앙탑면", "지현동", "칠금·금릉동", "호암·직동"]
        }]
    }],
    Dx = a => {
        var i;
        return ((i = Cx.find(l => l.name === a)) == null ? void 0 : i.districts) ?? []
    },
    Aj = (a, i) => {
        var l;
        return ((l = Dx(a).find(r => r.name === i)) == null ? void 0 : l.areas) ?? []
    },
    Ej = a => a.trim().toLowerCase().replace(/[_\s]+/g, "-"),
    Cj = a => {
        const i = Ej(a || "");
        return i ? i.includes("t-rex") && i.includes("3") ? "t-rex-3" : i.includes("bip") && i.includes("6") ? "bip-6" : "unknown" : "unknown"
    },
    Dj = a => a === "t-rex-3" ? {
        accelerometer: !0,
        gyroscope: !0,
        heartRate: !0,
        spo2: !0,
        steps: !0,
        gps: !0,
        barometer: !0,
        bodyTemperature: !0,
        hrv: !0,
        sleep: !0,
        stress: !0,
        battery: !0,
        noiseDb: !0,
        fall: !0
    } : a === "bip-6" ? {
        accelerometer: !0,
        gyroscope: !0,
        heartRate: !0,
        spo2: !0,
        steps: !0,
        gps: !0,
        barometer: !1,
        bodyTemperature: !1,
        hrv: !0,
        sleep: !0,
        stress: !0,
        battery: !0,
        noiseDb: !1,
        fall: !0
    } : {
        accelerometer: !0,
        gyroscope: !0,
        heartRate: !0,
        spo2: !0,
        steps: !0,
        gps: !0,
        barometer: !1,
        bodyTemperature: !1,
        hrv: !1,
        sleep: !1,
        stress: !1,
        battery: !0,
        noiseDb: !1,
        fall: !1
    },
    A0 = (a, i, l) => {
        if (typeof i != "number" || !Number.isFinite(i) || i <= 0) return a;
        const r = typeof l == "number" && Number.isFinite(l) ? l : Date.now(),
            f = a[a.length - 1];
        return f && Math.abs(f.heartRate - i) < 1 && r - f.timeMs < 2500 ? a.filter(d => r - d.timeMs <= 18e4).slice(-30) : [...a, {
            timeMs: r,
            heartRate: i
        }].filter(d => r - d.timeMs <= 18e4).slice(-30)
    },
    E0 = (a, i, l) => {
        if (typeof i == "number" && Number.isFinite(i) && i > 0) return Math.round(i);
        if (a.length < 4) return typeof l == "number" && Number.isFinite(l) && l > 0 ? Math.round(l) : void 0;
        const r = a.map(m => 6e4 / m.heartRate).filter(m => Number.isFinite(m) && m > 250 && m < 2e3);
        if (r.length < 4) return typeof l == "number" && Number.isFinite(l) && l > 0 ? Math.round(l) : void 0;
        const f = [];
        for (let m = 1; m < r.length; m += 1) {
            const h = r[m] - r[m - 1];
            f.push(h * h)
        }
        if (f.length < 3) return typeof l == "number" && Number.isFinite(l) && l > 0 ? Math.round(l) : void 0;
        const d = Math.sqrt(f.reduce((m, h) => m + h, 0) / f.length);
        return !Number.isFinite(d) || d <= 0 ? typeof l == "number" && Number.isFinite(l) && l > 0 ? Math.round(l) : void 0 : Math.max(12, Math.min(180, Math.round(d)))
    },
    to = ({
        biometric: a,
        location: i,
        battery: l
    }) => {
        const r = [],
            f = (I, P, W) => {
                if (typeof P != "number" || !Number.isFinite(P)) {
                    r.push({
                        label: I,
                        value: "--"
                    });
                    return
                }
                r.push({
                    label: I,
                    value: `${Math.round(P)}${W||""}`
                })
            },
            d = (I, P, W) => {
                if (typeof P != "number" || !Number.isFinite(P)) {
                    r.push({
                        label: I,
                        value: "--"
                    });
                    return
                }
                r.push({
                    label: I,
                    value: `${P.toFixed(1)}${W}`
                })
            };
        f("심박", a.heartRate, "bpm"), f("SpO2", a.spo2, "%"), f("걸음수", a.steps), d("체온", a.bodyTemperature, "°C"), f("Stress", a.stressLevel), f("HRV", a.hrv, "ms");
        const m = typeof(l == null ? void 0 : l.percent) == "number" ? l.percent : typeof a.batteryLevel == "number" ? a.batteryLevel : void 0;
        f("배터리", m, "%");
        const h = a.barometer,
            x = typeof(h == null ? void 0 : h.airPressure) == "number" && Number.isFinite(h.airPressure) ? h.airPressure : void 0,
            y = typeof(h == null ? void 0 : h.altitude) == "number" && Number.isFinite(h.altitude) ? h.altitude : void 0;
        r.push({
            label: "기압",
            value: typeof x == "number" ? `${Math.round(x)}hPa` : "--"
        }), r.push({
            label: "고도",
            value: typeof y == "number" ? `${Math.round(y)}m` : "--"
        });
        const g = a.acceleration,
            b = typeof(g == null ? void 0 : g.x) == "number" && Number.isFinite(g.x) ? g.x : void 0,
            S = typeof(g == null ? void 0 : g.y) == "number" && Number.isFinite(g.y) ? g.y : void 0,
            j = typeof(g == null ? void 0 : g.z) == "number" && Number.isFinite(g.z) ? g.z : void 0;
        r.push({
            label: "가속도",
            value: typeof b == "number" && typeof S == "number" && typeof j == "number" ? `${Math.sqrt(b*b+S*S+j*j).toFixed(2)}` : "--"
        });
        const A = a.gyroscope,
            G = typeof(A == null ? void 0 : A.x) == "number" && Number.isFinite(A.x) ? A.x : void 0,
            Y = typeof(A == null ? void 0 : A.y) == "number" && Number.isFinite(A.y) ? A.y : void 0,
            U = typeof(A == null ? void 0 : A.z) == "number" && Number.isFinite(A.z) ? A.z : void 0;
        return r.push({
            label: "자이로",
            value: typeof G == "number" && typeof Y == "number" && typeof U == "number" ? `${Math.sqrt(G*G+Y*Y+U*U).toFixed(2)}` : "--"
        }), r.push({
            label: "낙상",
            value: a.fallDetected === !0 ? "감지" : a.fallDetected === !1 ? "정상" : "--"
        }), i && typeof i.lat == "number" && typeof i.lng == "number" ? r.push({
            label: "GPS",
            value: `${i.lat.toFixed(5)},${i.lng.toFixed(5)}`
        }) : r.push({
            label: "GPS",
            value: "--"
        }), r
    },
    Bf = () => {
        try {
            const {
                hostname: a,
                origin: i,
                protocol: l
            } = window.location;
            if (a === "appassets.androidplatform.net") return "https://app.goldentime.sbs";
            if (a === "localhost" || a === "127.0.0.1" || a === "0.0.0.0") return "http://localhost:4003";
            if ((l === "http:" || l === "https:") && i) return i
        } catch {}
        return "https://app.goldentime.sbs"
    },
    Rj = ["A", "B", "AB", "O"],
    ti = "gt_member_auth_token",
    no = "gt_member_login_id",
    jo = "gt_member_auto_login_enabled",
    Rx = ["gmail.com", "naver.com", "daum.net", "hanmail.net", "kakao.com", "nate.com"],
    Oj = Array.from({
        length: 121
    }, (a, i) => String(i + 100)),
    zj = Array.from({
        length: 121
    }, (a, i) => String(i + 30)),
    ni = a => {
        const i = String(a || "").replace(/\D/g, "").slice(0, 11);
        return i.length <= 3 ? i : i.length <= 7 ? `${i.slice(0,3)}-${i.slice(3)}` : `${i.slice(0,3)}-${i.slice(3,7)}-${i.slice(7)}`
    },
    vl = a => String(a || "").replace(/\D/g, ""),
    _j = a => {
        const i = new Date(String(a || "").trim());
        if (Number.isNaN(i.getTime())) return 0;
        const l = new Date;
        let r = l.getFullYear() - i.getFullYear();
        const f = l.getMonth() - i.getMonth();
        return (f < 0 || f === 0 && l.getDate() < i.getDate()) && (r -= 1), r > 0 ? r : 0
    },
    Lj = a => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(a || "").trim()),
    Ox = a => String(a || "").replace(/\s+/g, " ").trim(),
    Vj = a => {
        const i = Ox(a),
            l = i.replace(/\s/g, "");
        return l.length < 2 || l.length > 20 ? !1 : /^[A-Za-z가-힣]+(?: [A-Za-z가-힣]+)*$/.test(i)
    },
    C0 = () => {
        try {
            const a = String(localStorage.getItem(ti) || "").trim();
            if (a) return a
        } catch {}
        try {
            return String(sessionStorage.getItem(ti) || "").trim()
        } catch {
            return ""
        }
    },
    Bj = (a, i) => {
        const l = String(a || "").trim();
        if (l) try {
            i ? (localStorage.setItem(ti, l), localStorage.setItem(jo, "1"), sessionStorage.removeItem(ti)) : (sessionStorage.setItem(ti, l), localStorage.removeItem(ti), localStorage.removeItem(jo))
        } catch {}
    },
    Uj = () => {
        try {
            localStorage.removeItem(ti), localStorage.removeItem(jo)
        } catch {}
        try {
            sessionStorage.removeItem(ti)
        } catch {}
    },
    Hj = a => {
        const i = String(a || "").trim().toLowerCase();
        if (!i.includes("@")) return {
            localPart: i,
            domainOption: "",
            customDomain: ""
        };
        const [l, r = ""] = i.split("@"), f = r.trim(), d = Rx.find(m => m === f);
        return {
            localPart: l.trim(),
            domainOption: d || (f ? "custom" : ""),
            customDomain: d ? "" : f
        }
    },
    D0 = ({
        localPart: a,
        domainOption: i,
        customDomain: l
    }) => {
        const r = String(a || "").replace(/\s/g, "").toLowerCase(),
            f = i === "custom" ? String(l || "").replace(/\s/g, "").toLowerCase() : String(i || "").replace(/\s/g, "").toLowerCase();
        return r ? f ? `${r}@${f}` : r : ""
    },
    Gj = a => {
        const i = l => String(l || "").split(/[\n,]/).map(r => r.trim()).filter(Boolean);
        return {
            chronicDiseases: i(a.medicalConditions).map(l => ({
                disease: l
            })),
            medications: i(a.medications).map(l => ({
                name: l
            })),
            allergies: i(a.allergies).map(l => ({
                substance: l
            }))
        }
    },
    R0 = {
        service: {
            title: "서비스 이용약관",
            sections: [{
                heading: "서비스 목적",
                body: ["응급 사용자 회원앱은 워치와 연동된 생체 신호를 기반으로 응급 상황을 확인하고 관제센터와 보호자 연락을 지원합니다.", "회원은 본인 계정으로만 서비스를 이용해야 하며 타인의 정보를 무단으로 사용할 수 없습니다."]
            }, {
                heading: "회원 의무",
                body: ["회원가입 정보와 보호자 연락처는 실제 정보로 입력해야 합니다.", "워치 분실, 번호 변경, 보호자 변경 등 주요 정보가 바뀌면 회원이 직접 수정해야 합니다."]
            }, {
                heading: "서비스 제한",
                body: ["허위 신고, 타인 도용, 시스템 장애 유발 행위가 확인되면 서비스 이용이 제한될 수 있습니다.", "관제 연결과 구조 지원은 통신 환경, 기기 상태, 관리자 승인 상태에 따라 일부 제한될 수 있습니다."]
            }]
        },
        privacy: {
            title: "개인정보 수집 및 이용 동의",
            sections: [{
                heading: "수집 항목",
                body: ["이름, 휴대전화번호, 이메일, 생년월일, 혈액형, 신장, 체중, 보호자 정보, 건강 메모를 수집합니다.", "서비스 이용 과정에서 워치 기기 정보, 생체 데이터, 위치 정보가 수집될 수 있습니다."]
            }, {
                heading: "이용 목적",
                body: ["응급 상황 감지, 회원 확인, 보호자 연락, 관제 대응, 이력 관리에 사용합니다.", "가입 승인, 계정 보안, 서비스 운영, 고객 문의 대응을 위해 사용할 수 있습니다."]
            }, {
                heading: "보관 및 권리",
                body: ["관련 법령 또는 서비스 운영 목적에 필요한 기간 동안 정보를 보관합니다.", "회원은 언제든지 본인 정보 열람, 수정, 탈퇴를 요청할 수 있습니다."]
            }]
            },
            location: {
                title: "위치정보 수집 및 이용 동의",
                sections: [{
                    heading: "수집 목적",
                    body: ["응급 상황 발생 시 신속한 위치 파악 및 구조 요청을 위해 위치정보를 수집합니다.", "관제센터에서 회원의 실시간 위치를 확인하여 가까운 응급 구조 기관에 연계할 수 있습니다."]
                }, {
                    heading: "수집 항목",
                    body: ["GPS 기반 실시간 위치 정보, 이동 경로, 위치 이력 등이 수집됩니다.", "위치정보는 앱이 백그라운드 상태일 때도 응급 감지를 위해 수집될 수 있습니다."]
                }, {
                    heading: "보관 및 제공",
                    body: ["위치정보는 서비스 제공 목적 달성 시 즉시 파기되며, 법령에 따라 요청되는 경우를 제외하고 제3자에게 제공되지 않습니다.", "응급 상황 발생 시 119 구급대 등 구조 기관에 현재 위치 정보가 제공될 수 있습니다."]
                }]
            },
            biometric: {
                title: "생체데이터 수집 및 이용 동의",
                sections: [{
                    heading: "수집 목적",
                    body: ["회원의 건강 상태 모니터링, 응급 상황 조기 감지 및 신속한 대응을 위해 웨어러블 기기에서 측정된 생체 데이터를 수집합니다.", "수집된 데이터는 응급 관제 및 건강 관리 목적으로만 사용됩니다."]
                }, {
                    heading: "수집 항목",
                    body: ["심박수(HR), 혈중산소(SpO₂), 체온, 걸음 수, 수면 데이터, 스트레스 지수 등 Amazfit 웨어러블 기기에서 측정된 생체 신호 데이터입니다.", "낙상 감지, 비정상 심박수 등 응급 상황을 판단하기 위한 데이터도 포함됩니다."]
                }, {
                    heading: "데이터 활용 및 권리",
                    body: ["수집된 생체 데이터는 암호화되어 저장되며, 회원은 언제든지 데이터 수집 중단 및 삭제를 요청할 수 있습니다.", "본 서비스의 생체 데이터 분석은 의료 진단을 대체하지 않으며, 참고용 정보로만 제공됩니다."]
                }]
            },
            thirdParty: {
                title: "제3자 정보 제공 동의",
                sections: [{
                    heading: "제공 목적",
                    body: ["응급 상황 발생 시 119 구급대, 경찰서, 협력 병원 등 유관 기관과의 신속한 공조를 위해 필요한 최소한의 정보를 제공합니다.", "보호자에게 응급 상황 발생 사실과 위치 정보를 전달하기 위해 정보가 제공될 수 있습니다."]
                }, {
                    heading: "제공 대상 및 항목",
                    body: ["응급 구조 기관(이름, 위치, 생체 신호 요약), 보호자(비상 연락망에 등록된 연락처), 협력 병원(응급 이송 시 필수 의료 정보) 등입니다.", "정보 제공은 응급 상황 발생 시에만 제한적으로 이루어집니다."]
                }, {
                    heading: "보호 조치",
                    body: ["정보 제공 시 암호화 전송, 접근 권한 최소화, 제공 이력 기록 등 기술적·관리적 보호 조치를 적용합니다.", "목적 외 사용을 금지하며, 제공된 정보는 관련 기관에서도 안전하게 관리됩니다."]
                }]
            },
            wearable: {
                title: "웨어러블 기기 연동 및 실시간 모니터링 서비스 이용약관",
                sections: [{
                    heading: "서비스 개요",
                    body: ["본 서비스는 Amazfit 웨어러블 기기와 연동하여 사용자의 생체 데이터를 실시간으로 수집·분석하고 응급 상황에 대응하는 서비스입니다.", "기기와 모바일 앱이 정상적으로 페어링된 상태에서만 데이터 수집이 가능합니다."]
                }, {
                    heading: "실시간 데이터",
                    body: ["심박수, 걸음 수, 위치 정보는 실시간(초 단위)으로 수집되며, 일부 생체 데이터(혈중산소, 체온 등)는 측정 주기에 따라 간헐적으로 수집될 수 있습니다.", "비정상 생체 신호(심박수 이상, 낙상 감지 등)가 탐지되면 관제센터에 자동 알림이 전송됩니다."]
                }, {
                    heading: "데이터 정확성 및 보안",
                    body: ["웨어러블 기기의 센서 정확도는 기기 상태, 착용 방법, 환경 요인에 따라 달라질 수 있으며, 본 서비스는 의료 기기를 대체하지 않습니다.", "수집된 모든 데이터는 암호화되어 전송·저장되며, 접근 권한은 엄격히 통제됩니다."]
                }]
            }
    },
    Yj = a => a === "pending" ? "어드민 승인 대기 중입니다." : a === "rejected" ? "가입 신청이 반려되었습니다. 관리자에게 문의해주세요." : a === "suspended" ? "이용이 정지된 계정입니다." : a === "withdrawn" ? "해지된 계정입니다." : "로그인할 수 없는 계정 상태입니다.",
    rf = a => ({
        medicalConditions: String((a == null ? void 0 : a.medicalConditions) || "").trim(),
        medications: String((a == null ? void 0 : a.medications) || "").trim(),
        allergies: String((a == null ? void 0 : a.allergies) || "").trim()
    }),
    of = a => a === "female" || a === "F" || a === "여" ? "여" : a === "male" || a === "M" || a === "남" ? "남" : "미상",
    cf = a => {
        const i = String(a || "").trim();
        return i && (i.includes("T") ? i.split("T")[0] : i) || "-"
    },
    qj = a => {
        const i = String(a || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(i)) return {
            year: "",
            month: "",
            day: ""
        };
        const [l, r, f] = i.split("-");
        return {
            year: l,
            month: r,
            day: f
        }
    },
    kj = () => {
        const a = new Date().getFullYear();
        return Array.from({
            length: a - 1900 + 1
        }, (i, l) => String(a - l))
    },
    O0 = (a, i) => {
        const l = Number(a),
            r = Number(i);
        if (!l || !r) return [];
        const f = new Date(l, r, 0).getDate();
        return Array.from({
            length: f
        }, (d, m) => String(m + 1).padStart(2, "0"))
    },
    Xj = ({
        year: a,
        month: i,
        day: l
    }) => {
        const r = Number(a),
            f = Number(i),
            d = Number(l);
        if (!r || !f || !d) return "";
        const m = new Date(r, f, 0).getDate(),
            h = Math.min(d, m);
        return `${String(r).padStart(4,"0")}-${String(f).padStart(2,"0")}-${String(h).padStart(2,"0")}`
    },
    yl = a => ({
        name: String((a == null ? void 0 : a.name) || "").trim(),
        phone: String((a == null ? void 0 : a.phone) || "").trim(),
        relationship: String((a == null ? void 0 : a.relationship) || "").trim()
    }),
    Kj = a => ({
        agreedService: !1,
        agreedPrivacy: !1,
        agreedLocation: !1,
        agreedBiometric: !1,
        agreedThirdParty: !1,
        agreedWearable: !1,
        name: "".trim(),
        phone: "",
        email: "".trim().toLowerCase(),
        password: "",
        passwordConfirm: "",
        city: "",
        district: "",
        dong: "",
        welfareName: "",
        birthDate: "".trim() === "-" ? "" : "".trim(),
        bloodType: "".trim(),
        height: "170",
        weight: "65",
        guardianName: "".trim(),
        guardianPhone: "".trim(),
        guardianRelationship: "".trim(),
        medicalConditions: "".trim(),
        medications: "".trim(),
        allergies: "".trim()
    }),
    Zj = (a, i) => {
        const l = a.filter(d => d.city === i.city && d.district === i.district && d.dong === i.dong);
        if (l.length > 0) return Array.from(new Set(l.map(d => d.welfareName))).sort((d, m) => d.localeCompare(m, "ko"));
        const r = a.filter(d => d.city === i.city && d.district === i.district);
        if (r.length > 0) return Array.from(new Set(r.map(d => d.welfareName))).sort((d, m) => d.localeCompare(m, "ko"));
        const f = a.filter(d => d.city === i.city);
        return f.length > 0 ? Array.from(new Set(f.map(d => d.welfareName))).sort((d, m) => d.localeCompare(m, "ko")) : Array.from(new Set(a.map(d => d.welfareName))).sort((d, m) => d.localeCompare(m, "ko"))
    },
    Qj = () => ({
        systolic: 121,
        diastolic: 79
    }),
    Pj = () => {
        const a = Date.now();
        return [{
            text: `현재 생체신호는 전반적으로 안정 범위입니다.
심박수와 산소포화도는 정상이며, 이동량이 꾸준히 유지되고 있습니다.
수분 보충과 가벼운 스트레칭을 권장합니다.`,
            timeMs: a - 120 * 1e3,
            inputs: [{
                label: "심박수",
                value: "76 bpm"
            }, {
                label: "산소포화도",
                value: "98%"
            }, {
                label: "걸음수",
                value: "6,842보"
            }]
        }, {
            text: `최근 30분 동안 위치 이동은 안정적이며 낙상 징후는 감지되지 않았습니다.
스트레스 지표도 낮은 편으로 유지되고 있습니다.`,
            timeMs: a - 1080 * 1e3,
            inputs: [{
                label: "스트레스",
                value: "24"
            }, {
                label: "HRV",
                value: "54 ms"
            }, {
                label: "체온",
                value: "36.4°C"
            }]
        }]
    },
    z0 = {},
    Fj = null,
    ao = null,
    _0 = Qj(),
    L0 = Pj(),
    Jj = {
        heartRate: "심박수 HR",
        spo2: "산소포화도 SpO2",
        steps: "걸음수 STEP",
        bodyTemperature: "피부온도 TEMP",
        stressLevel: "스트레스 STRESS",
        hrv: "심박변이도 HRV",
        barometer: "기압/고도",
        accelerometer: "가속도계 ACC",
        gyroscope: "자이로 GYRO",
        fallDetected: "낙상 FALL",
        batteryLevel: "배터리",
        sleepStatus: "수면 SLEEP"
    },
    $j = {
        heartRate: "#ef4444",
        spo2: "#0ea5e9",
        steps: "#10b981",
        bodyTemperature: "#f97316",
        stressLevel: "#8b5cf6",
        hrv: "#6366f1",
        barometer: "#14b8a6",
        accelerometer: "#f59e0b",
        gyroscope: "#ec4899",
        fallDetected: "#dc2626",
        batteryLevel: "#eab308",
        sleepStatus: "#64748b"
    },
    zx = (a, i) => {
        var f, d, m, h, x, y, g;
        const l = a.biometric || {};
        if (i === "heartRate") return l.heartRate || 0;
        if (i === "spo2") return l.spo2 || 0;
        if (i === "steps") return l.steps || 0;
        if (i === "bodyTemperature") return l.bodyTemperature || 0;
        if (i === "stressLevel") return l.stressLevel || 0;
        if (i === "hrv") return l.hrv || 0;
        if (i === "barometer") return ((f = l.barometer) == null ? void 0 : f.airPressure) || 0;
        if (i === "accelerometer") {
            const b = ((d = l.acceleration) == null ? void 0 : d.x) || 0,
                S = ((m = l.acceleration) == null ? void 0 : m.y) || 0,
                j = ((h = l.acceleration) == null ? void 0 : h.z) || 0;
            return Math.sqrt(b * b + S * S + j * j)
        }
        if (i === "gyroscope") {
            const b = ((x = l.gyroscope) == null ? void 0 : x.x) || 0,
                S = ((y = l.gyroscope) == null ? void 0 : y.y) || 0,
                j = ((g = l.gyroscope) == null ? void 0 : g.z) || 0;
            return Math.sqrt(b * b + S * S + j * j)
        }
        if (i === "fallDetected") return l.fallDetected ? 100 : 0;
        if (i === "batteryLevel") return typeof a.batteryPercent == "number" && Number.isFinite(a.batteryPercent) ? a.batteryPercent : l.batteryLevel || 0;
        const r = String(l.sleepStatus || "").trim();
        return r ? r.includes("깊") ? 100 : r.includes("안정") ? 80 : r.includes("얕") ? 55 : 35 : 0
    },
    V0 = (a, i) => {
        var r, f;
        if (!i) return "--";
        const l = i.biometric || {};
        if (a === "heartRate") return typeof l.heartRate == "number" ? `${Math.round(l.heartRate)} BPM` : "--";
        if (a === "spo2") return typeof l.spo2 == "number" ? `${Math.round(l.spo2)}%` : "--";
        if (a === "steps") return typeof l.steps == "number" ? `${Math.round(l.steps).toLocaleString()}보` : "--";
        if (a === "bodyTemperature") return typeof l.bodyTemperature == "number" ? `${l.bodyTemperature.toFixed(1)}°C` : "--";
        if (a === "stressLevel") return typeof l.stressLevel == "number" ? `${Math.round(l.stressLevel)}점` : "--";
        if (a === "hrv") return typeof l.hrv == "number" ? `${Math.round(l.hrv)}ms` : "--";
        if (a === "barometer") {
            const d = (r = l.barometer) == null ? void 0 : r.airPressure,
                m = (f = l.barometer) == null ? void 0 : f.altitude;
            return typeof d == "number" && typeof m == "number" ? `${Math.round(d)}hPa · ${Math.round(m)}m` : typeof d == "number" ? `${Math.round(d)}hPa` : "--"
        }
        if (a === "accelerometer" || a === "gyroscope") {
            const d = zx(i, a);
            return d > 0 ? `${d.toFixed(2)} mag` : "--"
        }
        if (a === "fallDetected") return l.fallDetected ? "감지" : "정상";
        if (a === "batteryLevel") {
            const d = typeof i.batteryPercent == "number" && Number.isFinite(i.batteryPercent) ? i.batteryPercent : l.batteryLevel;
            return typeof d == "number" ? `${Math.round(d)}%` : "--"
        }
        return String(l.sleepStatus || "--")
    },
    Ij = (a, i) => {
        const l = [...a].reverse(),
            r = l.map(b => zx(b, i));
        if (r.length === 0) return {
            path: "",
            min: 0,
            max: 0,
            ordered: l
        };
        const f = Math.max(...r),
            d = Math.min(...r),
            m = 300,
            h = 120,
            x = 10,
            y = f - d || 1;
        return {
            path: r.map((b, S) => {
                const j = x + S * (m - x * 2) / Math.max(r.length - 1, 1),
                    A = h - x - (b - d) / y * (h - x * 2);
                return `${S===0?"M":"L"} ${j} ${A}`
            }).join(" "),
            min: d,
            max: f,
            ordered: l
        }
    },
    B0 = (a, i, l, r) => {
        const f = typeof r == "number" && Number.isFinite(r) ? r : Date.now(),
            d = a[a.length - 1],
            m = JSON.stringify({
                heartRate: i.heartRate,
                spo2: i.spo2,
                steps: i.steps,
                bodyTemperature: i.bodyTemperature,
                stressLevel: i.stressLevel,
                hrv: i.hrv,
                batteryPercent: l,
                fallDetected: i.fallDetected
            }),
            h = d ? JSON.stringify({
                heartRate: d.biometric.heartRate,
                spo2: d.biometric.spo2,
                steps: d.biometric.steps,
                bodyTemperature: d.biometric.bodyTemperature,
                stressLevel: d.biometric.stressLevel,
                hrv: d.biometric.hrv,
                batteryPercent: d.batteryPercent,
                fallDetected: d.biometric.fallDetected
            }) : "";
        return d && h === m && f - d.timeMs < 2500 ? a : [...a, {
            timeMs: f,
            biometric: {
                ...i
            },
            batteryPercent: l
        }].slice(-60)
    },
    Wj = ({
        value: a,
        onClick: i
    }) => {
        const l = typeof a == "number" ? a : 72;
        return u.jsx(st.div, {
            initial: {
                opacity: 0,
                scale: .95
            },
            animate: {
                opacity: 1,
                scale: 1
            },
            transition: {
                delay: .1
            },
            onClick: i,
            className: `flex min-h-[104px] flex-col justify-between rounded-lg border border-orange-100 bg-white px-2 py-2.5 shadow-sm ${i?"cursor-pointer active:scale-[0.98] transition-transform":""}`,
            children: u.jsxs("div", {
                children: [u.jsx("span", {
                    className: "whitespace-nowrap text-[13px] font-semibold tracking-wider text-slate-600",
                    children: "심박수"
                }), u.jsx("div", {
                    className: "mt-3",
                    children: u.jsxs("div", {
                        className: "flex items-baseline justify-end gap-1 gt-card-data",
                        children: [u.jsx("span", {
                            className: "font-headline text-2xl font-extrabold text-slate-900",
                            children: l
                        }), u.jsx("span", {
                            className: "text-[10px] text-slate-500",
                            children: "BPM"
                        })]
                    })
                })]
            })
        })
    },
    e3 = ({
        value: a,
        onClick: i
    }) => {
        const l = typeof a == "number",
            f = l && a >= 0 && a <= 100 ? Math.max(0, Math.min(100, a)) : 0,
            d = 2 * Math.PI * 36,
            m = d * (1 - f / 100),
            [h, x] = M.useState(!1);
        return M.useEffect(() => {
            if (!h) return;
            const y = window.setTimeout(() => x(!1), 8e3);
            return () => window.clearTimeout(y)
        }, [h]), u.jsxs(st.div, {
            initial: {
                opacity: 0,
                scale: .95
            },
            animate: {
                opacity: 1,
                scale: 1
            },
            transition: {
                delay: .2
            },
            onClick: i,
            className: `flex min-h-[104px] flex-col justify-between rounded-lg border border-orange-100 bg-white p-2.5 shadow-sm ${i?"cursor-pointer active:scale-[0.98] transition-transform":""}`,
            children: [u.jsx("div", {
                children: u.jsxs("div", {
                    className: "flex min-h-6 items-center justify-between gap-2",
                    children: [u.jsx("span", {
                        className: "text-left text-[13px] font-semibold tracking-wider text-slate-600 break-keep",
                        children: "산소포화도"
                    }), u.jsx("button", {
                        onClick: y => {
                            var g, b, S, j;
                            if (y.stopPropagation(), h) {
                                (b = (g = window.AndroidBridge) == null ? void 0 : g.stopSpo2Measure) == null || b.call(g), x(!1);
                                return
                            }(j = (S = window.AndroidBridge) == null ? void 0 : S.startSpo2MeasureOnce) == null || j.call(S), x(!0)
                        },
                        className: "shrink-0 rounded-lg bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold text-orange-600 transition-transform active:scale-[0.98]",
                        children: h ? "중지" : "측정"
                    })]
                })
            }), u.jsx("div", {
                className: "mt-3 flex flex-1 items-center justify-center",
                children: u.jsxs("div", {
                    className: "relative flex h-[52px] w-[52px] items-center justify-center",
                    children: [u.jsxs("svg", {
                        className: "w-full h-full -rotate-90",
                        viewBox: "0 0 80 80",
                        children: [u.jsx("circle", {
                            className: "text-orange-100",
                            cx: "40",
                            cy: "40",
                            fill: "transparent",
                            r: "36",
                            stroke: "currentColor",
                            strokeWidth: "6"
                        }), u.jsx("circle", {
                            className: "text-orange-500",
                            cx: "40",
                            cy: "40",
                            fill: "transparent",
                            r: "36",
                            stroke: "currentColor",
                            strokeDasharray: d,
                            strokeDashoffset: m,
                            strokeWidth: "6",
                            strokeLinecap: "round"
                        })]
                    }), u.jsx("span", {
                        className: "absolute font-headline text-[13px] font-bold text-slate-900",
                        children: l ? `${f}%` : "--"
                    })]
                })
            })]
        })
    },
    t3 = ({
        value: a,
        onClick: i
    }) => {
        const l = typeof a == "number" && a >= 0 ? Math.max(0, a) : null,
            r = l == null ? 0 : Math.min(1, l / 1e4);
        return u.jsx(st.div, {
            initial: {
                opacity: 0,
                scale: .95
            },
            animate: {
                opacity: 1,
                scale: 1
            },
            transition: {
                delay: .3
            },
            onClick: i,
            className: `flex min-h-[104px] flex-col justify-between rounded-lg border border-orange-100 bg-white p-2.5 shadow-sm ${i?"cursor-pointer active:scale-[0.98] transition-transform":""}`,
            children: u.jsxs("div", {
                children: [u.jsx("span", {
                    className: "text-[13px] font-semibold tracking-wider text-slate-600",
                    children: "걸음 수"
                }), u.jsxs("div", {
                    className: "mt-3",
                    children: [u.jsx("div", {
                        className: "gt-card-data",
                        children: u.jsx("span", {
                            className: "font-headline text-2xl font-extrabold text-slate-900",
                            children: l == null ? "--" : l.toLocaleString()
                        })
                    }), u.jsx("div", {
                        className: "mt-3 h-2.5 w-full overflow-hidden rounded-full bg-orange-100",
                        children: u.jsx("div", {
                            className: "h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400",
                            style: {
                                width: `${Math.round(r*100)}%`
                            }
                        })
                    })]
                })]
            })
        })
    },
    n3 = ({
        value: a,
        onClick: i
    }) => {
        const l = typeof a == "number" && Number.isFinite(a);
        return u.jsx(st.div, {
            initial: {
                opacity: 0,
                scale: .95
            },
            animate: {
                opacity: 1,
                scale: 1
            },
            transition: {
                delay: .32
            },
            onClick: i,
            className: `flex min-h-[104px] flex-col justify-between rounded-lg border border-orange-100 bg-white px-2 py-2.5 shadow-sm ${i?"cursor-pointer active:scale-[0.98] transition-transform":""}`,
            children: u.jsxs("div", {
                children: [u.jsx("span", {
                    className: "text-[13px] font-semibold tracking-wider text-slate-600",
                    children: "피부온도"
                }), u.jsxs("div", {
                    className: "mt-3 flex items-baseline justify-end gap-1 gt-card-data",
                    children: [u.jsx("span", {
                        className: "font-headline text-2xl font-extrabold text-slate-900",
                        children: l ? a.toFixed(1) : "--"
                    }), u.jsx("span", {
                        className: "text-[10px] text-slate-500",
                        children: "°C"
                    })]
                })]
            })
        })
    },
    a3 = ({
        value: a,
        onClick: i
    }) => {
        const r = typeof a == "number" && Number.isFinite(a) ? Math.max(0, Math.min(100, a)) : null;
        return u.jsx(st.div, {
            initial: {
                opacity: 0,
                scale: .95
            },
            animate: {
                opacity: 1,
                scale: 1
            },
            transition: {
                delay: .34
            },
            onClick: i,
            className: `flex min-h-[104px] flex-col justify-between rounded-lg border border-orange-100 bg-white p-2.5 shadow-sm ${i?"cursor-pointer active:scale-[0.98] transition-transform":""}`,
            children: u.jsxs("div", {
                children: [u.jsx("span", {
                    className: "text-[13px] font-semibold tracking-wider text-slate-600",
                    children: "스트레스"
                }), u.jsxs("div", {
                    className: "mt-3 flex items-baseline justify-end gap-1 gt-card-data",
                    children: [u.jsx("span", {
                        className: "font-headline text-2xl font-extrabold text-slate-900",
                        children: r == null ? "--" : Math.round(r)
                    }), u.jsx("span", {
                        className: "text-[10px] text-slate-500",
                        children: "점"
                    })]
                })]
            })
        })
    },
    i3 = ({
        value: a,
        onClick: i
    }) => {
        const l = typeof a == "number" && Number.isFinite(a);
        return u.jsx(st.div, {
            initial: {
                opacity: 0,
                scale: .95
            },
            animate: {
                opacity: 1,
                scale: 1
            },
            transition: {
                delay: .38
            },
            onClick: i,
            className: `flex min-h-[104px] flex-col justify-between rounded-lg border border-orange-100 bg-white p-2.5 shadow-sm ${i?"cursor-pointer active:scale-[0.98] transition-transform":""}`,
            children: u.jsxs("div", {
                children: [u.jsx("span", {
                    className: "text-[13px] font-semibold tracking-wider text-slate-600",
                    children: "심박변이도"
                }), u.jsxs("div", {
                    className: "mt-3 flex items-baseline justify-end gap-1 gt-card-data",
                    children: [u.jsx("span", {
                        className: "font-headline text-2xl font-extrabold text-slate-900",
                        children: l ? Math.round(a) : "--"
                    }), u.jsx("span", {
                        className: "text-[10px] text-slate-500",
                        children: "ms"
                    })]
                })]
            })
        })
    },
    s3 = ({
        value: a,
        onClick: i
    }) => {
        const l = typeof(a == null ? void 0 : a.airPressure) == "number" && Number.isFinite(a.airPressure) ? a.airPressure : null,
            r = typeof(a == null ? void 0 : a.altitude) == "number" && Number.isFinite(a.altitude) ? a.altitude : null;
        return u.jsx(st.div, {
            initial: {
                opacity: 0,
                scale: .95
            },
            animate: {
                opacity: 1,
                scale: 1
            },
            transition: {
                delay: .42
            },
            onClick: i,
            className: `flex min-h-[104px] flex-col justify-between rounded-lg border border-orange-100 bg-white p-2.5 shadow-sm ${i?"cursor-pointer active:scale-[0.98] transition-transform":""}`,
            children: u.jsxs("div", {
                children: [u.jsx("span", {
                    className: "text-[13px] font-semibold tracking-wider text-slate-600",
                    children: "기압/고도"
                }), u.jsxs("div", {
                    className: "mt-2.5 space-y-1.5",
                    children: [u.jsxs("div", {
                        className: "flex items-baseline justify-end gap-1 leading-none",
                        children: [u.jsx("span", {
                            className: "text-[9px] font-semibold tracking-wider text-slate-500",
                            children: "기압"
                        }), u.jsx("span", {
                            className: "font-headline text-base font-extrabold leading-none text-slate-900",
                            children: l == null ? "--" : Math.round(l)
                        }), u.jsx("span", {
                            className: "text-[8px] leading-none text-slate-500",
                            children: "hPa"
                        })]
                    }), u.jsxs("div", {
                        className: "flex items-baseline justify-end gap-1 leading-none",
                        children: [u.jsx("span", {
                            className: "text-[9px] font-semibold tracking-wider text-slate-500",
                            children: "고도"
                        }), u.jsx("span", {
                            className: "font-headline text-base font-extrabold leading-none text-slate-900",
                            children: r == null ? "--" : Math.round(r)
                        }), u.jsx("span", {
                            className: "text-[8px] leading-none text-slate-500",
                            children: "m"
                        })]
                    })]
                })]
            })
        })
    },
    l3 = ({
        value: a,
        onClick: i
    }) => {
        const l = typeof(a == null ? void 0 : a.x) == "number" && Number.isFinite(a.x) ? a.x : null,
            r = typeof(a == null ? void 0 : a.y) == "number" && Number.isFinite(a.y) ? a.y : null,
            f = typeof(a == null ? void 0 : a.z) == "number" && Number.isFinite(a.z) ? a.z : null,
            d = l == null || r == null || f == null ? null : Math.sqrt(l * l + r * r + f * f);
        return u.jsx(st.div, {
            initial: {
                opacity: 0,
                scale: .95
            },
            animate: {
                opacity: 1,
                scale: 1
            },
            transition: {
                delay: .44
            },
            onClick: i,
            className: `flex min-h-[104px] flex-col justify-between rounded-lg border border-orange-100 bg-white p-2.5 shadow-sm ${i?"cursor-pointer active:scale-[0.98] transition-transform":""}`,
            children: u.jsxs("div", {
                children: [u.jsx("span", {
                    className: "text-[13px] font-semibold tracking-wider text-slate-600",
                    children: "가속도계"
                }), u.jsxs("div", {
                    className: "mt-2.5 gt-card-data",
                    children: [u.jsxs("div", {
                        className: "flex items-baseline gap-1 justify-end",
                        children: [u.jsx("span", {
                            className: "font-headline text-lg font-extrabold text-slate-900",
                            children: d == null ? "--" : d.toFixed(2)
                        }), u.jsx("span", {
                            className: "text-[9px] text-slate-500",
                            children: "mag"
                        })]
                    }), u.jsxs("div", {
                        className: "mt-1.5 break-all text-[9px] font-mono font-bold leading-tight text-slate-400 gt-card-data",
                        children: ["x:", l == null ? "--" : l.toFixed(2), " y:", r == null ? "--" : r.toFixed(2), " z:", f == null ? "--" : f.toFixed(2)]
                    })]
                })]
            })
        })
    },
    r3 = ({
        value: a,
        onClick: i
    }) => {
        const l = typeof(a == null ? void 0 : a.x) == "number" && Number.isFinite(a.x) ? a.x : null,
            r = typeof(a == null ? void 0 : a.y) == "number" && Number.isFinite(a.y) ? a.y : null,
            f = typeof(a == null ? void 0 : a.z) == "number" && Number.isFinite(a.z) ? a.z : null,
            d = l == null || r == null || f == null ? null : Math.sqrt(l * l + r * r + f * f);
        return u.jsx(st.div, {
            initial: {
                opacity: 0,
                scale: .95
            },
            animate: {
                opacity: 1,
                scale: 1
            },
            transition: {
                delay: .46
            },
            onClick: i,
            className: `flex min-h-[104px] flex-col justify-between rounded-lg border border-orange-100 bg-white p-2.5 shadow-sm ${i?"cursor-pointer active:scale-[0.98] transition-transform":""}`,
            children: u.jsxs("div", {
                children: [u.jsx("span", {
                    className: "text-[13px] font-semibold tracking-wider text-slate-600",
                    children: "자이로"
                }), u.jsxs("div", {
                    className: "mt-2.5 gt-card-data",
                    children: [u.jsxs("div", {
                        className: "flex items-baseline gap-1 justify-end",
                        children: [u.jsx("span", {
                            className: "font-headline text-lg font-extrabold text-slate-900",
                            children: d == null ? "--" : d.toFixed(2)
                        }), u.jsx("span", {
                            className: "text-[9px] text-slate-500",
                            children: "mag"
                        })]
                    }), u.jsxs("div", {
                        className: "mt-1.5 break-all text-[9px] font-mono font-bold leading-tight text-slate-400 gt-card-data",
                        children: ["x:", l == null ? "--" : l.toFixed(2), " y:", r == null ? "--" : r.toFixed(2), " z:", f == null ? "--" : f.toFixed(2)]
                    })]
                })]
            })
        })
    },
    o3 = ({
        value: a,
        onClick: i
    }) => {
        const l = a === !0 ? "감지" : a === !1 ? "정상" : "--",
            r = a === !0 ? "text-error" : a === !1 ? "text-blue-700" : "text-on-surface";
        return u.jsx(st.div, {
            initial: {
                opacity: 0,
                scale: .95
            },
            animate: {
                opacity: 1,
                scale: 1
            },
            transition: {
                delay: .48
            },
            onClick: i,
            className: `flex min-h-[104px] flex-col justify-between rounded-lg border border-orange-100 bg-white p-2.5 shadow-sm ${i?"cursor-pointer active:scale-[0.98] transition-transform":""}`,
            children: u.jsxs("div", {
                children: [u.jsx("span", {
                    className: "text-[13px] font-semibold tracking-wider text-slate-600",
                    children: "낙상"
                }), u.jsx("div", {
                    className: "mt-3 flex items-baseline justify-end gap-2 gt-card-data",
                    children: u.jsx("span", {
                        className: `font-headline text-2xl font-extrabold ${r}`,
                        children: l
                    })
                })]
            })
        })
    },
    c3 = ({
        location: a,
        onClick: i
    }) => {
        const l = (a == null ? void 0 : a.status) ?? "unknown",
            r = l === "ok" && typeof(a == null ? void 0 : a.lat) == "number" && typeof(a == null ? void 0 : a.lng) == "number",
            f = r ? a.lat : void 0,
            d = r ? a.lng : void 0,
            m = r && typeof(a == null ? void 0 : a.accuracyM) == "number" ? a.accuracyM : void 0,
            h = r ? typeof(a == null ? void 0 : a.speedMps) == "number" && Number.isFinite(a.speedMps) ? a.speedMps : 0 : void 0,
            x = r ? (a == null ? void 0 : a.provider) ?? "unknown" : void 0,
            y = r && typeof(a == null ? void 0 : a.timeMs) == "number" ? a.timeMs : void 0,
            g = y ? new Date(y).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }) : "--",
            b = typeof h == "number" ? h * 3.6 : void 0;
        let S = "수신 대기 중";
        return l === "permission_denied" && (S = "위치 권한 필요"), l === "provider_disabled" && (S = "GPS/위치 서비스 꺼짐"), r && (S = `정확도 ±${m!=null?Math.round(m):"--"}m · ${x}`), u.jsxs(st.div, {
            initial: {
                opacity: 0,
                y: 20
            },
            animate: {
                opacity: 1,
                y: 0
            },
            transition: {
                delay: .35
            },
            onClick: i,
            className: `rounded-lg border border-orange-100 bg-white p-4 shadow-sm ${i?"cursor-pointer active:scale-[0.98] transition-transform":""}`,
            children: [u.jsxs("div", {
                className: "flex items-start justify-between gap-4",
                children: [u.jsxs("div", {
                    children: [u.jsx("div", {
                        className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider",
                        children: "GPS 위치"
                    }), u.jsx("div", {
                        className: "mt-1 text-xs font-bold text-on-surface-variant",
                        children: S
                    })]
                }), u.jsxs("div", {
                    className: "text-right",
                    children: [u.jsx("div", {
                        className: "text-[10px] font-bold text-on-surface-variant uppercase tracking-wider",
                        children: "업데이트"
                    }), u.jsx("div", {
                        className: "font-mono text-xs font-bold text-on-surface",
                        children: g
                    })]
                })]
            }), u.jsxs("div", {
                className: "mt-4 grid grid-cols-2 gap-3",
                children: [u.jsxs("div", {
                    className: "bg-surface-container-low rounded-lg p-3",
                    children: [u.jsx("div", {
                        className: "text-[10px] font-bold text-on-surface-variant uppercase tracking-wider",
                        children: "위도"
                    }), u.jsx("div", {
                        className: "font-mono text-xs font-bold text-on-surface gt-card-data",
                        children: f != null ? f.toFixed(6) : "--"
                    })]
                }), u.jsxs("div", {
                    className: "bg-surface-container-low rounded-lg p-3",
                    children: [u.jsx("div", {
                        className: "text-[10px] font-bold text-on-surface-variant uppercase tracking-wider",
                        children: "경도"
                    }), u.jsx("div", {
                        className: "font-mono text-xs font-bold text-on-surface gt-card-data",
                        children: d != null ? d.toFixed(6) : "--"
                    })]
                }), u.jsxs("div", {
                    className: "bg-surface-container-low rounded-lg p-3",
                    children: [u.jsx("div", {
                        className: "text-[10px] font-bold text-on-surface-variant uppercase tracking-wider",
                        children: "속도"
                    }), u.jsx("div", {
                        className: "font-headline text-xs font-bold text-on-surface gt-card-data",
                        children: b != null ? `${b.toFixed(1)} km/h` : "--"
                    })]
                }), u.jsxs("div", {
                    className: "bg-surface-container-low rounded-lg p-3",
                    children: [u.jsx("div", {
                        className: "text-[10px] font-bold text-on-surface-variant uppercase tracking-wider",
                        children: "정확도"
                    }), u.jsx("div", {
                        className: "font-headline text-xs font-bold text-on-surface gt-card-data",
                        children: m != null ? `±${Math.round(m)} m` : "--"
                    })]
                })]
            })]
        })
    },
    u3 = ({
        location: a,
        onClick: i
    }) => {
        const l = (a == null ? void 0 : a.status) ?? "unknown",
            r = l === "ok" && typeof(a == null ? void 0 : a.lat) == "number" && typeof(a == null ? void 0 : a.lng) == "number",
            f = r ? a.lat : void 0,
            d = r ? a.lng : void 0,
            m = 16,
            h = .01,
            x = r ? `${d-h},${f-h},${d+h},${f+h}` : "",
            y = r ? `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(x)}&layer=mapnik&marker=${encodeURIComponent(`${f},${d}`)}` : "";
        let g = "수신 대기 중";
        return l === "permission_denied" && (g = "위치 권한 필요"), l === "provider_disabled" && (g = "GPS/위치 서비스 꺼짐"), r && (g = "현재 위치 지도"), u.jsxs(st.div, {
            initial: {
                opacity: 0,
                y: 20
            },
            animate: {
                opacity: 1,
                y: 0
            },
            transition: {
                delay: .4
            },
            onClick: i,
            className: `rounded-lg border border-orange-100 bg-white p-4 shadow-sm ${i?"cursor-pointer active:scale-[0.98] transition-transform":""}`,
            children: [u.jsxs("div", {
                className: "flex items-start justify-between gap-4",
                children: [u.jsxs("div", {
                    children: [u.jsx("div", {
                        className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider",
                        children: "지도"
                    }), u.jsx("div", {
                        className: "mt-1 text-xs font-bold text-on-surface-variant",
                        children: g
                    })]
                }), r && u.jsxs("div", {
                    className: "text-right",
                    children: [u.jsx("div", {
                        className: "text-[10px] font-bold text-on-surface-variant uppercase tracking-wider",
                        children: "줌"
                    }), u.jsx("div", {
                        className: "font-mono text-xs font-bold text-on-surface",
                        children: m
                    })]
                })]
            }), u.jsx("div", {
                className: "mt-4 overflow-hidden rounded-lg bg-surface-container-low border border-surface-container-low",
                children: r ? u.jsx("iframe", {
                    title: "location-map",
                    src: y,
                    className: "w-full h-44",
                    loading: "lazy",
                    referrerPolicy: "no-referrer"
                }) : u.jsx("div", {
                    className: "h-44 flex items-center justify-center text-xs font-bold text-on-surface-variant",
                    children: "위치를 가져오는 중…"
                })
            })]
        })
    },
    f3 = ({
        biometric: a,
        location: i,
        analysis: l,
        bloodPressure: r,
        capabilities: f,
        connected: d,
        deviceName: m,
        battery: h,
        isGpsExpanded: x,
        onToggleGpsExpanded: y,
        onOpenPairing: g,
        onOpenMetricDetail: b
    }) => u.jsxs(st.div, {
        initial: {
            opacity: 0,
            y: 10
        },
        animate: {
            opacity: 1,
            y: 0
        },
        exit: {
            opacity: 0,
            y: -10
        },
        className: "space-y-3 pb-20 pt-5",
        children: [u.jsxs("header", {
            className: "flex items-center justify-between gap-3",
            children: [u.jsx("div", {
                className: "min-w-0",
                children: u.jsx("h1", {
                    className: "text-[20px] font-semibold tracking-[-0.02em] text-slate-900",
                    children: "회원앱"
                })
            }), u.jsx("button", {
                onClick: g,
                className: "inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition-colors hover:bg-orange-600 active:scale-95",
                children: u.jsx(jb, {
                    size: 12
                })
            })]
        }), (() => {
            const S = A => d ? A : !0,
                j = typeof(h == null ? void 0 : h.percent) == "number" ? h.percent : typeof a.batteryLevel == "number" ? a.batteryLevel : null;
            return u.jsx(u.Fragment, {
                children: u.jsx("div", {
                    className: "space-y-4",
                    children: u.jsxs("div", {
                        className: "grid grid-cols-3 gap-2",
                        children: [S(f.heartRate) ? u.jsx(Wj, {
                            value: a.heartRate,
                            onClick: d ? () => b("heartRate") : void 0
                        }) : null, S(f.spo2) ? u.jsx(e3, {
                            value: a.spo2,
                            onClick: d ? () => b("spo2") : void 0
                        }) : null, S(f.steps) ? u.jsx(t3, {
                            value: a.steps,
                            onClick: d ? () => b("steps") : void 0
                        }) : null, S(f.accelerometer) ? u.jsx(l3, {
                            value: a.acceleration,
                            onClick: d ? () => b("accelerometer") : void 0
                        }) : null, S(f.fall) ? u.jsx(o3, {
                            value: a.fallDetected,
                            onClick: d ? () => b("fallDetected") : void 0
                        }) : null, S(f.gyroscope) ? u.jsx(r3, {
                            value: a.gyroscope,
                            onClick: d ? () => b("gyroscope") : void 0
                        }) : null, S(f.bodyTemperature) ? u.jsx(n3, {
                            value: a.bodyTemperature,
                            onClick: d ? () => b("bodyTemperature") : void 0
                        }) : null, S(f.stress) ? u.jsx(a3, {
                            value: a.stressLevel,
                            onClick: d ? () => b("stressLevel") : void 0
                        }) : null, S(f.hrv) ? u.jsx(i3, {
                            value: a.hrv,
                            onClick: d ? () => b("hrv") : void 0
                        }) : null, u.jsx(st.div, {
                            initial: {
                                opacity: 0,
                                scale: .95
                            },
                            animate: {
                                opacity: 1,
                                scale: 1
                            },
                            transition: {
                                delay: .28
                            },
                            onClick: d ? () => b("batteryLevel") : void 0,
                            className: `flex min-h-[104px] flex-col justify-between rounded-lg border border-orange-100 bg-white p-2.5 shadow-sm ${d?"cursor-pointer active:scale-[0.98] transition-transform":""}`,
                            children: u.jsxs("div", {
                                children: [u.jsx("span", {
                                    className: "text-[13px] font-semibold tracking-wider text-slate-600",
                                    children: "배터리"
                                }), u.jsxs("div", {
                                    className: "mt-3 flex items-baseline justify-end gap-1 leading-none",
                                    children: [u.jsx("span", {
                                        className: "font-headline text-2xl font-extrabold leading-none text-slate-900",
                                        children: j == null ? "--" : Math.round(j)
                                    }), u.jsx("span", {
                                        className: "text-[10px] leading-none text-slate-500",
                                        children: "%"
                                    })]
                                })]
                            })
                        }), S(f.barometer) ? u.jsx(s3, {
                            value: a.barometer,
                            onClick: d ? () => b("barometer") : void 0
                        }) : null, S(f.gps) ? u.jsx("div", {
                            className: "col-span-3",
                            children: u.jsx(u3, {
                                location: i
                            })
                        }) : null, S(f.gps) ? u.jsxs("div", {
                            className: "col-span-3 overflow-hidden rounded-lg border border-orange-100 bg-white shadow-sm",
                            children: [u.jsxs("button", {
                                type: "button",
                                onClick: y,
                                className: "flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-orange-50/70",
                                children: [u.jsxs("div", {
                                    children: [u.jsx("div", {
                                        className: "text-[13px] font-semibold tracking-[-0.01em] text-slate-900",
                                        children: "GPS 위치"
                                    }), u.jsx("div", {
                                        className: "mt-1 text-[12px] text-slate-500",
                                        children: x ? "현재 위치 정보를 숨깁니다." : "현재 위치 정보를 펼쳐서 확인합니다."
                                    })]
                                }), u.jsx(Y0, {
                                    size: 18,
                                    className: `shrink-0 text-slate-400 transition-transform duration-200 ${x?"rotate-180":""}`
                                })]
                            }), x ? u.jsx("div", {
                                className: "space-y-3 border-t border-orange-100 px-4 py-4",
                                children: u.jsx(c3, {
                                    location: i
                                })
                            }) : null]
                        }) : null]
                    })
                })
            })
        })()]
    }, "home"),
    d3 = ({
        onBack: a,
        knownDevice: i,
        knownConnected: l,
        backendBase: r,
        isSignupPairingFlow: f
    }) => {
        const [d, m] = M.useState("scan"), [h, x] = M.useState(!1), [y, g] = M.useState(() => i ? [i] : []), [b, S] = M.useState(null), [j, A] = M.useState(l), [G, Y] = M.useState("idle"), U = () => {
            var $;
            x(!0), g([]), S(null), A(!1), Y("idle");
            try {
                ($ = window.AndroidBridge) == null || $.startScan()
            } catch (ne) {
                console.error("Native startScan error:", ne), setTimeout(() => {
                    g([{
                        name: "GTR5",
                        mac: "00:1A:2B:3C:4D:5E"
                    }]), x(!1)
                }, 2e3)
            }
        }, I = M.useRef(G);
        M.useEffect(() => {
            I.current = G
        }, [G]), M.useEffect(() => {
            const $ = ne => {
                var Me, Se, Fe, ze;
                const ce = ne,
                    te = ce == null ? void 0 : ce.detail;
                if (te != null && te.action) {
                    if (console.log("Native Event Received:", te.action, te.data), te.action === "SCAN_STARTED") {
                        x(!0), g([]);
                        return
                    }
                    if (te.action === "SCAN_FINISHED") {
                        x(!1);
                        return
                    }
                    if (te.action === "DEVICE_FOUND") {
                        const Ae = te.data ?? {},
                            O = String(Ae.mac ?? "");
                        if (!O) return;
                        const E = String(Ae.name ?? "Unknown"),
                            ae = typeof Ae.rssi == "number" ? Ae.rssi : void 0;
                        g(ge => ge.some(Ne => Ne.mac === O) ? ge : [...ge, {
                            name: E,
                            mac: O,
                            rssi: ae
                        }]);
                        return
                    }
                    if (te.action === "CONNECTION_STATE") {
                        const Ae = !!((Me = te.data) != null && Me.connected),
                            O = String(((Se = te.data) == null ? void 0 : Se.mac) ?? ""),
                            E = String(((Fe = te.data) == null ? void 0 : Fe.name) ?? "Unknown");
                        if (O && g(ae => ae.some(ge => ge.mac === O) ? ae : [{
                                mac: O,
                                name: E
                            }, ...ae]), A(Ae), Ae) {
                            if (m("pairing"), I.current === "idle") {
                                Y("waiting_watch");
                                try {
                                    (ze = window.AndroidBridge) == null || ze.startPairing()
                                } catch {}
                            }
                        } else Y("idle"), m("scan");
                        return
                    }
                    if (te.action === "PAIRING_RESPONSE_RECEIVED") {
                        Y("waiting_app");
                        return
                    }
                    if (te.action === "PAIRING_SUCCESS") {
                        Y("done"), m("approved");
                        const Ae = String(b || (i == null ? void 0 : i.mac) || "").trim();
                        Ae && !f && fetch(`${r}/api/mobile/biometric-event`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                mac: Ae,
                                timestamp: Date.now(),
                                biometric: {
                                    isWear: !0
                                }
                            })
                        }).catch(() => {});
                        return
                    }
                    if (te.action === "PAIRING_FAILED") {
                        Y("failed"), setTimeout(() => m("pairing"), 2e3);
                        return
                    }
                    if (te.action === "UNPAIR_SUCCESS") {
                        Y("idle"), A(!1), S(null), g([]), m("scan");
                        const Ae = String((i == null ? void 0 : i.mac) || b || "").trim();
                        Ae && fetch(`${r}/api/mobile/device-unpair`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                mac: Ae,
                                timestamp: new Date().toISOString(),
                                reason: "unpaired"
                            })
                        }).catch(() => {});
                        try {
                            localStorage.removeItem("gt_paired_device"), localStorage.setItem("gt_connected", "0")
                        } catch {}
                        window.location.reload();
                        return
                    }
                }
            };
            return window.addEventListener("AndroidToWeb", $), () => window.removeEventListener("AndroidToWeb", $)
        }, [r, f, i == null ? void 0 : i.mac, b]);
        const P = $ => {
                var ne;
                S($), m("pairing"), Y("idle");
                try {
                    (ne = window.AndroidBridge) == null || ne.connectDevice($)
                } catch (ce) {
                    console.error("Native connectDevice error:", ce)
                }
            },
            W = () => {
                var $;
                try {
                    ($ = window.AndroidBridge) == null || $.approvePairing()
                } catch (ne) {
                    console.error("Native approvePairing error:", ne)
                }
            },
            se = async () => {
                var $;
                try {
                    ($ = window.AndroidBridge) == null || $.unpairDevice()
                } catch (ne) {
                    console.error("Native unpairDevice error:", ne)
                }
            }, he = () => {
                var $;
                try {
                    ($ = window.AndroidBridge) == null || $.startBiometric()
                } catch (ne) {
                    console.error("Native startBiometric error:", ne)
                }
                a()
            };
        return u.jsxs(st.div, {
            initial: {
                opacity: 0,
                x: 20
            },
            animate: {
                opacity: 1,
                x: 0
            },
            exit: {
                opacity: 0,
                x: -20
            },
            className: "space-y-4 pb-28 pt-6",
            children: [u.jsxs("header", {
                className: "flex items-center gap-3",
                children: [u.jsx("button", {
                    onClick: a,
                    className: "inline-flex h-10 w-10 items-center justify-center rounded-full border border-orange-100 bg-white text-slate-500 shadow-sm",
                    children: u.jsx(ho, {
                        className: "rotate-180",
                        size: 20
                    })
                }), u.jsxs("div", {
                    children: [u.jsx("h1", {
                        className: "text-[20px] font-semibold tracking-[-0.02em] text-slate-900",
                        children: "기기 연결"
                    }), u.jsx("p", {
                        className: "text-[13px] text-slate-500",
                        children: "워치 디바이스 페어링"
                    })]
                })]
            }), u.jsxs("div", {
                className: "space-y-6",
                children: [u.jsxs("div", {
                    className: "rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                    children: [u.jsxs("div", {
                        className: "flex justify-between items-center mb-8",
                        children: [u.jsx("h3", {
                            className: "font-bold text-lg",
                            children: "1. 블루투스 스캔"
                        }), u.jsx("button", {
                            onClick: U,
                            disabled: h,
                            className: `rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${h?"bg-orange-50 text-slate-500":"bg-orange-500 text-white shadow-sm"}`,
                            children: h ? "스캔 중..." : "스캔 시작"
                        })]
                    }), u.jsxs("div", {
                        className: "space-y-3",
                        children: [h && u.jsxs("div", {
                            className: "flex flex-col items-center py-8 space-y-4",
                            children: [u.jsx("div", {
                                className: "h-12 w-12 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500"
                            }), u.jsx("p", {
                                className: "animate-pulse text-xs font-bold text-slate-500",
                                children: "주변 기기를 찾는 중입니다..."
                            })]
                        }), !h && y.length > 0 && y.map(($, ne) => u.jsxs(st.div, {
                            initial: {
                                opacity: 0,
                                y: 10
                            },
                            animate: {
                                opacity: 1,
                                y: 0
                            },
                            className: "flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50 p-4",
                            children: [u.jsxs("div", {
                                className: "flex items-center gap-4",
                                children: [u.jsx("div", {
                                    className: "flex h-10 w-10 items-center justify-center rounded-full bg-white text-orange-600",
                                    children: u.jsx(df, {
                                        size: 20
                                    })
                                }), u.jsxs("div", {
                                    children: [u.jsx("p", {
                                        className: "font-bold text-on-surface",
                                        children: $.name
                                    }), u.jsx("p", {
                                        className: "text-[10px] font-mono text-on-surface-variant",
                                        children: $.mac
                                    })]
                                })]
                            }), d === "scan" && (!!i && $.mac === i.mac ? u.jsx("button", {
                                onClick: se,
                                className: "bg-error text-white px-4 py-2 rounded-lg text-xs font-bold",
                                children: "페어링 해제"
                            }) : u.jsx("button", {
                                onClick: () => P($.mac),
                                className: "bg-secondary text-white px-4 py-2 rounded-lg text-xs font-bold",
                                children: "페어링 시작"
                            }))]
                        }, ne)), !h && y.length === 0 && u.jsx("div", {
                            className: "rounded-lg border-2 border-dashed border-orange-100 py-8 text-center",
                            children: u.jsx("p", {
                                className: "text-sm font-medium text-slate-500",
                                children: "스캔 버튼을 눌러 기기를 찾아주세요"
                            })
                        })]
                    })]
                }), u.jsx(Rl, {
                    children: d !== "scan" && u.jsxs(st.div, {
                        initial: {
                            opacity: 0,
                            y: 20
                        },
                        animate: {
                            opacity: 1,
                            y: 0
                        },
                        className: "rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                        children: [u.jsx("h3", {
                            className: "font-bold text-lg mb-6",
                            children: "2. 페어링 승인"
                        }), u.jsxs("div", {
                            className: "flex flex-col items-center py-4 space-y-6",
                            children: [u.jsxs("div", {
                                className: "relative",
                                children: [u.jsx("div", {
                                    className: `flex h-20 w-20 items-center justify-center rounded-full transition-all duration-500 ${d==="approved"?"bg-emerald-500 text-white":"bg-orange-50 text-orange-600 animate-pulse"}`,
                                    children: d === "approved" ? u.jsx(q0, {
                                        size: 40
                                    }) : u.jsx(df, {
                                        size: 40
                                    })
                                }), d !== "approved" && u.jsx("div", {
                                    className: "absolute -inset-2 animate-[spin_10s_linear_infinite] rounded-full border-2 border-dashed border-orange-400"
                                })]
                            }), u.jsx("p", {
                                className: "text-center text-sm leading-relaxed text-slate-500",
                                children: d === "approved" ? "기기 페어링이 성공적으로 완료되었습니다." : G === "failed" ? "페어링에 실패했습니다. 다시 시도해주세요." : G === "waiting_app" ? "워치 승인 완료. 앱에서 “페어링 승인 완료”를 눌러주세요." : j ? "워치 화면에서 페어링 요청을 승인해주세요." : b ? "기기 연결 중... 잠시만 기다려주세요." : "스캔에서 기기를 선택해주세요."
                            }), d === "pairing" && G === "waiting_app" && u.jsx("button", {
                                onClick: W,
                                className: "w-full rounded-lg bg-orange-500 py-4 font-bold text-white shadow-sm transition-transform active:scale-[0.98]",
                                children: "페어링 승인 완료"
                            })]
                        })]
                    })
                }), u.jsx(Rl, {
                    children: d === "approved" && u.jsx(st.div, {
                        initial: {
                            opacity: 0,
                            y: 20
                        },
                        animate: {
                            opacity: 1,
                            y: 0
                        },
                        className: "pt-4",
                        children: u.jsxs("button", {
                            onClick: he,
                            className: "flex w-full items-center justify-center gap-3 rounded-lg bg-orange-500 py-5 text-lg font-extrabold text-white shadow-sm transition-transform active:scale-[0.98]",
                            children: [u.jsx(G0, {
                                size: 24
                            }), "생체데이터 수집 시작"]
                        })
                    })
                })]
            })]
        })
    },
    U0 = a => a && a.split(`
`).map(i => {
        const l = i.trim();
        return l.startsWith("복합상황:") ? l.replace("복합상황:", "참고상황:").replace("급성 위험을 강하게 시사하는", "주의 깊게 살펴볼 필요가 있는").replace("복합 징후가 제한적입니다.", "상황 신호는 현재 크지 않아 보입니다.").replace("낙상/무응답/음주 후 의식저하/센서 한계 등 함께 볼 맥락", "함께 참고하면 좋은 주변 상황").replace("센서 한계", "센서 특성").replace("무응답", "반응 확인 필요").replace("낙상", "넘어짐 가능성").replace("의식저하", "상태 저하 가능성") : i
    }).join(`
`),
    m3 = ({
        history: a
    }) => {
        var i, l, r;
        return u.jsxs(st.div, {
            initial: {
                opacity: 0,
                y: 10
            },
            animate: {
                opacity: 1,
                y: 0
            },
            exit: {
                opacity: 0,
                y: -10
            },
            className: "space-y-4 pb-28 pt-6",
            children: [u.jsxs("header", {
                className: "rounded-lg border border-orange-100 bg-white px-4 py-4 shadow-sm",
                children: [u.jsx("h1", {
                    className: "text-[20px] font-semibold tracking-[-0.02em] text-slate-900",
                    children: "생체분석"
                }), u.jsx("p", {
                    className: "mt-1 text-[13px] text-slate-500",
                    children: "심층적인 건강 트렌드 분석"
                })]
            }), a.length > 0 && u.jsxs("div", {
                className: "rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                children: [u.jsxs("div", {
                    className: "flex flex-wrap items-center justify-between gap-2",
                    children: [u.jsx("span", {
                        className: "rounded-full bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-600",
                        children: "LLM AI 최신분석"
                    }), u.jsx("span", {
                        className: "text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-right",
                        children: (i = a[0]) != null && i.timeMs ? new Date(a[0].timeMs).toLocaleString("ko-KR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                        }) : "--"
                    })]
                }), u.jsx("div", {
                    className: "whitespace-pre-line break-words text-sm leading-relaxed text-slate-600",
                    children: U0((l = a[0]) == null ? void 0 : l.text) || "분석 대기 중…"
                }), u.jsxs("div", {
                    className: "pt-2",
                    children: [u.jsx("div", {
                        className: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
                        children: "분석 기준 데이터"
                    }), u.jsx("div", {
                        className: "mt-2 flex gap-2 overflow-x-auto",
                        children: (((r = a[0]) == null ? void 0 : r.inputs) || []).map((f, d) => u.jsxs("div", {
                            className: "max-w-[180px] shrink-0 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2",
                            children: [u.jsx("div", {
                                className: "text-[9px] font-bold uppercase tracking-wider text-slate-400",
                                children: f.label
                            }), u.jsx("div", {
                                className: "mt-0.5 break-all text-xs font-extrabold text-slate-900",
                                children: f.value
                            })]
                        }, `${f.label}-${d}`))
                    })]
                })]
            }), a.length === 0 && u.jsx("div", {
                className: "rounded-lg border border-orange-100 bg-white p-5 text-sm text-slate-500 shadow-sm",
                children: "분석 대기 중…"
            }), u.jsx("div", {
                className: "space-y-4",
                children: a.slice(0, 30).map((f, d) => u.jsxs("div", {
                    className: "rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                    children: [u.jsxs("div", {
                        className: "flex flex-wrap items-center justify-between gap-3",
                        children: [u.jsx("span", {
                            className: "text-[10px] font-bold uppercase tracking-widest text-orange-600",
                            children: "LLM 분석"
                        }), u.jsx("span", {
                            className: "text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-right",
                            children: f.timeMs ? new Date(f.timeMs).toLocaleString("ko-KR", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                            }) : "--"
                        })]
                    }), u.jsx("div", {
                        className: "whitespace-pre-line break-words text-sm leading-relaxed text-slate-600",
                        children: U0(f.text) || "분석 대기 중…"
                    }), u.jsxs("div", {
                        className: "pt-1",
                        children: [u.jsx("div", {
                            className: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
                            children: "분석 기준 데이터"
                        }), u.jsx("div", {
                            className: "mt-2 flex gap-2 overflow-x-auto",
                            children: (f.inputs || []).map((m, h) => u.jsxs("div", {
                                className: "max-w-[180px] shrink-0 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2",
                                children: [u.jsx("div", {
                                    className: "text-[9px] font-bold uppercase tracking-wider text-slate-400",
                                    children: m.label
                                }), u.jsx("div", {
                                    className: "mt-0.5 break-all text-xs font-extrabold text-slate-900",
                                    children: m.value
                                })]
                            }, `${m.label}-${h}`))
                        })]
                    })]
                }, `${f.timeMs??"t"}-${d}`))
            })]
        }, "analysis")
    },
    h3 = ({
        metricKey: a,
        snapshots: i,
        onBack: l
    }) => {
        var h, x, y;
        const r = i[i.length - 1] || null,
            f = Ij(i.slice(-12), a),
            d = $j[a],
            m = `mobile-metric-fill-${a}`;
        return u.jsxs(st.div, {
            initial: {
                opacity: 0,
                y: 10
            },
            animate: {
                opacity: 1,
                y: 0
            },
            exit: {
                opacity: 0,
                y: -10
            },
            className: "space-y-4 pb-28 pt-6",
            children: [u.jsxs("header", {
                className: "flex items-center gap-3",
                children: [u.jsx("button", {
                    onClick: l,
                    className: "inline-flex h-10 w-10 items-center justify-center rounded-full border border-orange-100 bg-white text-slate-500 shadow-sm",
                    children: u.jsx(ho, {
                        className: "rotate-180",
                        size: 20
                    })
                }), u.jsxs("div", {
                    children: [u.jsx("h1", {
                        className: "text-[20px] font-semibold tracking-[-0.02em] text-slate-900",
                        children: Jj[a]
                    }), u.jsx("p", {
                        className: "mt-1 text-[13px] text-slate-500",
                        children: "그래프와 히스토리 데이터"
                    })]
                })]
            }), u.jsx("div", {
                className: "rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                children: u.jsxs("div", {
                    className: "flex items-start justify-between gap-4",
                    children: [u.jsxs("div", {
                        children: [u.jsx("div", {
                            className: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
                            children: "현재 값"
                        }), u.jsx("div", {
                            className: "mt-2 font-headline font-extrabold text-3xl",
                            style: {
                                color: d
                            },
                            children: V0(a, r)
                        }), u.jsx("div", {
                            className: "mt-2 text-xs font-medium text-slate-500",
                            children: r != null && r.timeMs ? new Date(r.timeMs).toLocaleString("ko-KR", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                            }) : "--"
                        })]
                    }), u.jsx("div", {
                        className: "w-12 h-12 rounded-lg shadow-sm",
                        style: {
                            backgroundColor: d
                        }
                    })]
                })
            }), u.jsxs("div", {
                className: "rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                children: [u.jsxs("div", {
                    className: "flex items-center justify-between gap-3",
                    children: [u.jsx("span", {
                        className: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
                        children: "최근 그래프"
                    }), u.jsxs("span", {
                        className: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
                        children: ["최대 ", Math.round(f.max * 10) / 10, " · 최소 ", Math.round(f.min * 10) / 10]
                    })]
                }), u.jsxs("div", {
                    className: "mt-4 rounded-lg bg-orange-50 p-3",
                    children: [u.jsxs("svg", {
                        viewBox: "0 0 300 120",
                        className: "h-36 w-full",
                        preserveAspectRatio: "none",
                        children: [u.jsx("defs", {
                            children: u.jsxs("linearGradient", {
                                id: m,
                                x1: "0",
                                x2: "0",
                                y1: "0",
                                y2: "1",
                                children: [u.jsx("stop", {
                                    offset: "0%",
                                    stopColor: d,
                                    stopOpacity: "0.28"
                                }), u.jsx("stop", {
                                    offset: "100%",
                                    stopColor: d,
                                    stopOpacity: "0.03"
                                })]
                            })
                        }), u.jsx("line", {
                            x1: "10",
                            x2: "290",
                            y1: "20",
                            y2: "20",
                            stroke: "rgba(148,163,184,0.25)",
                            strokeDasharray: "4 4"
                        }), u.jsx("line", {
                            x1: "10",
                            x2: "290",
                            y1: "60",
                            y2: "60",
                            stroke: "rgba(148,163,184,0.25)",
                            strokeDasharray: "4 4"
                        }), u.jsx("line", {
                            x1: "10",
                            x2: "290",
                            y1: "100",
                            y2: "100",
                            stroke: "rgba(148,163,184,0.25)",
                            strokeDasharray: "4 4"
                        }), f.path ? u.jsxs(u.Fragment, {
                            children: [u.jsx("path", {
                                d: `${f.path} L 290 110 L 10 110 Z`,
                                fill: `url(#${m})`
                            }), u.jsx("path", {
                                d: f.path,
                                fill: "none",
                                stroke: d,
                                strokeWidth: "3",
                                strokeLinecap: "round",
                                strokeLinejoin: "round"
                            })]
                        }) : null]
                    }), u.jsxs("div", {
                        className: "mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400",
                        children: [u.jsx("span", {
                            children: (h = f.ordered[0]) != null && h.timeMs ? new Date(f.ordered[0].timeMs).toLocaleTimeString("ko-KR") : "--"
                        }), u.jsx("span", {
                            children: (x = f.ordered[Math.floor(f.ordered.length / 2)]) != null && x.timeMs ? new Date(f.ordered[Math.floor(f.ordered.length / 2)].timeMs).toLocaleTimeString("ko-KR") : "--"
                        }), u.jsx("span", {
                            children: (y = f.ordered[f.ordered.length - 1]) != null && y.timeMs ? new Date(f.ordered[f.ordered.length - 1].timeMs).toLocaleTimeString("ko-KR") : "--"
                        })]
                    })]
                })]
            }), u.jsxs("div", {
                className: "rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                children: [u.jsx("div", {
                    className: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
                    children: "히스토리 데이터"
                }), u.jsx("div", {
                    className: "mt-4 space-y-3",
                    children: [...i].reverse().slice(0, 10).map((g, b) => u.jsxs("div", {
                        className: "flex items-center justify-between gap-3 rounded-lg border border-orange-100 bg-orange-50 px-4 py-3",
                        children: [u.jsx("div", {
                            className: "text-xs font-bold text-slate-500",
                            children: new Date(g.timeMs).toLocaleString("ko-KR", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                            })
                        }), u.jsx("div", {
                            className: "text-sm font-extrabold",
                            style: {
                                color: d
                            },
                            children: V0(a, g)
                        })]
                    }, `${a}-${g.timeMs}-${b}`))
                })]
            })]
        }, "metric-detail")
    },
    p3 = ({
        onOpenSignup: a,
        onSubmit: i
    }) => {
        const [l, r] = M.useState(() => {
            try {
                return String(localStorage.getItem(no) || "").trim().toLowerCase()
            } catch {
                return ""
            }
        }), [f, d] = M.useState(""), [m, h] = M.useState(!1), [x, y] = M.useState(() => {
            try {
                return String(localStorage.getItem(no) || "").trim().length > 0
            } catch {
                return !1
            }
        }), [g, b] = M.useState(() => {
            try {
                return localStorage.getItem(jo) === "1"
            } catch {
                return !1
            }
        }), [S, j] = M.useState(!1), [A, G] = M.useState(""), [Y, U] = M.useState(null), [I, P] = M.useState(""), [W, se] = M.useState(""), [he, $] = M.useState(""), [ne, ce] = M.useState(!1), [te, Me] = M.useState(""), [Se, Fe] = M.useState(""), [ze, Ae] = M.useState(""), [O, E] = M.useState(""), [ae, ge] = M.useState(!1), [Ne, T] = M.useState(""), [X, K] = M.useState(!1), [re, ye] = M.useState(!1), Te = "text-[24px] font-semibold tracking-[-0.02em] text-slate-900", we = "mb-2 text-[13px] font-medium text-slate-600", Le = "flex h-[44px] items-center gap-3 overflow-hidden rounded-lg border border-orange-100 bg-white px-4", Ee = "h-full min-h-0 w-full appearance-none bg-transparent text-[14px] leading-none outline-none", yt = "inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-[14px] font-semibold text-white shadow-sm disabled:opacity-60", Zt = "inline-flex items-center gap-2 text-[13px] font-medium text-slate-600", zt = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-orange-50 hover:text-orange-500", jt = async () => {
            const Ce = String(l || "").trim().toLowerCase(),
                _t = String(f || "").trim();
            if (!Ce || !_t) {
                G("이메일과 비밀번호를 입력해주세요.");
                return
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Ce)) {
                G("올바른 이메일 형식이 아닙니다.");
                return
            }
            if (_t.length < 6) {
                G("비밀번호는 6자 이상 입력해주세요.");
                return
            }
            h(!0), G("");
            const Nn = await i({
                email: Ce,
                password: _t,
                autoLogin: g
            });
            if (h(!1), Nn) {
                G(Nn);
                return
            }
            try {
                x ? localStorage.setItem(no, Ce) : localStorage.removeItem(no)
            } catch {}
        }, Ve = async () => {
            if (!I.trim() || !W.trim()) {
                $("이름과 전화번호를 입력해주세요.");
                return
            }
            ce(!0), $("");
            try {
                const _t = await (await fetch(`${Bf()}/api/mobile/find-email`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: I.trim(),
                        phone: W.trim()
                    })
                })).json();
                _t.success ? $(`가입된 이메일: ${_t.email}`) : $(_t.message || "계정을 찾을 수 없습니다.")
            } catch {
                $("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.")
            } finally {
                ce(!1)
            }
        }, We = async () => {
            if (!te.trim() || !Se.trim() || !ze.trim()) {
                E("모든 정보를 입력해주세요.");
                return
            }
            if (ze.length < 6) {
                E("비밀번호는 6자 이상이어야 합니다.");
                return
            }
            if (ze !== Ne) {
                E("비밀번호가 일치하지 않습니다.");
                return
            }
            ge(!0), E("");
            try {
                const _t = await (await fetch(`${Bf()}/api/mobile/reset-password`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: te.trim().toLowerCase(),
                        phone: Se.trim(),
                        newPassword: ze
                    })
                })).json();
                _t.success ? E("비밀번호가 재설정되었습니다. 로그인 화면으로 돌아가서 새 비밀번호로 로그인해주세요.") : E(_t.message || "비밀번호 재설정에 실패했습니다.")
            } catch {
                E("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.")
            } finally {
                ge(!1)
            }
        };
        return u.jsx(st.div, {
            initial: {
                opacity: 0,
                y: 10
            },
            animate: {
                opacity: 1,
                y: 0
            },
            exit: {
                opacity: 0,
                y: -10
            },
            className: "py-8",
            children: u.jsxs("section", {
                className: "rounded-lg bg-white p-6 shadow-sm",
                children: [u.jsxs("div", {
                    className: "flex items-center justify-center gap-3",
                    children: [u.jsx("div", {
                        className: "rounded-lg bg-orange-50 p-2 text-orange-500",
                        children: u.jsx(og, {
                            size: 18
                        })
                    }), u.jsx("h1", {
                        className: Te,
                        children: "회원앱"
                    })]
                }), Y === "find-email" ? u.jsxs("div", {
                    className: "mt-5 space-y-4",
                    children: [u.jsxs("button", {
                        type: "button",
                        onClick: () => {
                            U(null), $("")
                        },
                        className: "inline-flex items-center gap-1.5 rounded-lg border border-orange-100 bg-white px-3 py-1.5 text-[13px] font-medium text-orange-600 shadow-sm transition hover:bg-orange-50",
                        children: [u.jsx(sg, {
                            size: 14
                        }), " 로그인으로 돌아가기"]
                    }), u.jsx("h2", {
                        className: "text-[16px] font-semibold text-slate-800",
                        children: "아이디(이메일) 찾기"
                    }), he ? u.jsx("div", {
                        className: `rounded-lg px-4 py-3 text-[13px] ${he.startsWith("가입된")?"border border-emerald-200 bg-emerald-50 text-emerald-700":"border border-amber-200 bg-amber-50 text-amber-700"}`,
                        children: he
                    }) : null, u.jsxs("div", {
                        children: [u.jsx("label", {
                            className: we,
                            children: "이름"
                        }), u.jsxs("div", {
                            className: Le,
                            children: [u.jsx(Mo, {
                                size: 16,
                                className: "text-orange-500"
                            }), u.jsx("input", {
                                type: "text",
                                value: I,
                                onChange: Ce => P(Ce.target.value),
                                placeholder: "이름 입력",
                                className: Ee
                            })]
                        })]
                    }), u.jsxs("div", {
                        children: [u.jsx("label", {
                            className: we,
                            children: "전화번호"
                        }), u.jsxs("div", {
                            className: Le,
                            children: [u.jsx(ff, {
                                size: 16,
                                className: "text-orange-500"
                            }), u.jsx("input", {
                                type: "text",
                                value: W,
                                onChange: Ce => se(Ce.target.value),
                                placeholder: "010-0000-0000",
                                className: Ee
                            })]
                        })]
                    }), u.jsxs("button", {
                        type: "button",
                        onClick: Ve,
                        disabled: ne,
                        className: yt,
                        children: [ne ? u.jsx(io, {
                            size: 16,
                            className: "animate-spin"
                        }) : null, "아이디 찾기"]
                    })]
                }) : Y === "find-password" ? u.jsxs("div", {
                    className: "mt-5 space-y-4",
                    children: [u.jsxs("button", {
                        type: "button",
                        onClick: () => {
                            U(null), E("")
                        },
                        className: "inline-flex items-center gap-1.5 rounded-lg border border-orange-100 bg-white px-3 py-1.5 text-[13px] font-medium text-orange-600 shadow-sm transition hover:bg-orange-50",
                        children: [u.jsx(sg, {
                            size: 14
                        }), " 로그인으로 돌아가기"]
                    }), u.jsx("h2", {
                        className: "text-[16px] font-semibold text-slate-800",
                        children: "비밀번호 재설정"
                    }), O ? u.jsx("div", {
                        className: `rounded-lg px-4 py-3 text-[13px] ${O.includes("재설정되었습니다")?"border border-emerald-200 bg-emerald-50 text-emerald-700":"border border-amber-200 bg-amber-50 text-amber-700"}`,
                        children: O
                    }) : null, u.jsxs("div", {
                        children: [u.jsx("label", {
                            className: we,
                            children: "이메일"
                        }), u.jsxs("div", {
                            className: Le,
                            children: [u.jsx(uf, {
                                size: 16,
                                className: "text-orange-500"
                            }), u.jsx("input", {
                                type: "text",
                                value: te,
                                onChange: Ce => Me(Ce.target.value.toLowerCase()),
                                placeholder: "example@email.com",
                                className: Ee
                            })]
                        })]
                    }), u.jsxs("div", {
                        children: [u.jsx("label", {
                            className: we,
                            children: "전화번호"
                        }), u.jsxs("div", {
                            className: Le,
                            children: [u.jsx(ff, {
                                size: 16,
                                className: "text-orange-500"
                            }), u.jsx("input", {
                                type: "text",
                                value: Se,
                                onChange: Ce => Fe(Ce.target.value),
                                placeholder: "010-0000-0000",
                                className: Ee
                            })]
                        })]
                    }), u.jsxs("div", {
                        children: [u.jsx("label", {
                            className: we,
                            children: "새 비밀번호"
                        }), u.jsxs("div", {
                            className: Le,
                            children: [u.jsx(Tl, {
                                size: 16,
                                className: "text-orange-500"
                            }), u.jsx("input", {
                                type: X ? "text" : "password",
                                value: ze,
                                onChange: Ce => Ae(Ce.target.value),
                                placeholder: "새 비밀번호 (6자 이상)",
                                className: Ee
                            }), ze ? u.jsx("button", {
                                type: "button",
                                onClick: () => Ae(""),
                                className: zt,
                                "aria-label": "비밀번호 지우기",
                                children: u.jsx(vs, {
                                    size: 14
                                })
                            }) : null, u.jsx("button", {
                                type: "button",
                                onClick: () => K(Ce => !Ce),
                                className: zt,
                                "aria-label": "비밀번호 보기",
                                children: X ? u.jsx(bl, {
                                    size: 16
                                }) : u.jsx(Sl, {
                                    size: 16
                                })
                            })]
                        })]
                    }), u.jsxs("div", {
                        children: [u.jsx("label", {
                            className: we,
                            children: "새 비밀번호 확인"
                        }), u.jsxs("div", {
                            className: Le,
                            children: [u.jsx(Tl, {
                                size: 16,
                                className: "text-orange-500"
                            }), u.jsx("input", {
                                type: re ? "text" : "password",
                                value: Ne,
                                onChange: Ce => T(Ce.target.value),
                                placeholder: "비밀번호 재입력",
                                className: Ee
                            }), Ne ? u.jsx("button", {
                                type: "button",
                                onClick: () => T(""),
                                className: zt,
                                "aria-label": "비밀번호 확인 지우기",
                                children: u.jsx(vs, {
                                    size: 14
                                })
                            }) : null, u.jsx("button", {
                                type: "button",
                                onClick: () => ye(Ce => !Ce),
                                className: zt,
                                "aria-label": "비밀번호 확인 보기",
                                children: re ? u.jsx(bl, {
                                    size: 16
                                }) : u.jsx(Sl, {
                                    size: 16
                                })
                            })]
                        })]
                    }), u.jsxs("button", {
                        type: "button",
                        onClick: We,
                        disabled: ae,
                        className: yt,
                        children: [ae ? u.jsx(io, {
                            size: 16,
                            className: "animate-spin"
                        }) : null, "비밀번호 재설정"]
                    })]
                }) : u.jsxs(u.Fragment, {
                    children: [u.jsxs("div", {
                        className: "mt-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1",
                        children: [u.jsx("button", {
                            type: "button",
                            onClick: () => G(""),
                            className: "rounded-lg bg-white px-4 py-3 text-[14px] text-slate-900 shadow-sm",
                            children: "로그인"
                        }), u.jsx("button", {
                            type: "button",
                            onClick: a,
                            className: "rounded-lg px-4 py-3 text-[14px] text-slate-500 transition-colors",
                            children: "회원가입"
                        })]
                    }), A ? u.jsx("div", {
                        className: "mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700",
                        children: A
                    }) : null, u.jsxs("form", {
                        className: "mt-5 space-y-4",
                        onSubmit: Ce => {
                            Ce.preventDefault(), jt()
                        },
                        children: [u.jsxs("div", {
                            children: [u.jsx("label", {
                                className: we,
                                children: "이메일"
                            }), u.jsxs("div", {
                                className: Le,
                                children: [u.jsx(uf, {
                                    size: 16,
                                    className: "text-orange-500"
                                }), u.jsx("input", {
                                    type: "text",
                                    value: l,
                                    onChange: Ce => {
                                        r(Ce.target.value.toLowerCase()), A && G("")
                                    },
                                    placeholder: "example@email.com",
                                    className: Ee
                                })]
                            })]
                        }), u.jsxs("div", {
                            children: [u.jsx("label", {
                                className: we,
                                children: "비밀번호"
                            }), u.jsxs("div", {
                                className: Le,
                                children: [u.jsx(Tl, {
                                    size: 16,
                                    className: "text-orange-500"
                                }), u.jsx("input", {
                                    type: S ? "text" : "password",
                                    value: f,
                                    onChange: Ce => {
                                        d(Ce.target.value), A && G("")
                                    },
                                    placeholder: "비밀번호 입력",
                                    className: Ee
                                }), f ? u.jsx("button", {
                                    type: "button",
                                    onClick: () => {
                                        d(""), A && G("")
                                    },
                                    className: zt,
                                    "aria-label": "비밀번호 지우기",
                                    children: u.jsx(vs, {
                                        size: 14
                                    })
                                }) : null, u.jsx("button", {
                                    type: "button",
                                    onClick: () => j(Ce => !Ce),
                                    className: zt,
                                    "aria-label": S ? "비밀번호 숨기기" : "비밀번호 보기",
                                    children: S ? u.jsx(bl, {
                                        size: 16
                                    }) : u.jsx(Sl, {
                                        size: 16
                                    })
                                })]
                            })]
                        }), u.jsxs("div", {
                            className: "flex flex-wrap items-center gap-x-4 gap-y-2",
                            children: [u.jsxs("label", {
                                className: Zt,
                                children: [u.jsx("input", {
                                    type: "checkbox",
                                    checked: x,
                                    onChange: Ce => y(Ce.target.checked),
                                    className: "h-[16px] w-[16px] rounded border border-slate-300 text-orange-500"
                                }), u.jsx("span", {
                                    className: "text-[13px] font-medium text-slate-600",
                                    children: "ID 저장"
                                })]
                            }), u.jsxs("label", {
                                className: Zt,
                                children: [u.jsx("input", {
                                    type: "checkbox",
                                    checked: g,
                                    onChange: Ce => b(Ce.target.checked),
                                    className: "h-[16px] w-[16px] rounded border border-slate-300 text-orange-500"
                                }), u.jsx("span", {
                                    className: "text-[13px] font-medium text-slate-600",
                                    children: "자동 로그인"
                                })]
                            })]
                        }), u.jsxs("button", {
                            type: "submit",
                            disabled: m,
                            className: `${yt} mt-2`,
                            children: [m ? u.jsx(io, {
                                size: 16,
                                className: "animate-spin"
                            }) : u.jsx(og, {
                                size: 16
                            }), "로그인"]
                        }), u.jsxs("div", {
                            className: "mt-4 text-center",
                            children: [u.jsx("button", {
                                type: "button",
                                onClick: () => U("find-email"),
                                className: "text-[13px] text-slate-400 hover:text-slate-600",
                                children: "아이디 찾기"
                            }), u.jsx("span", {
                                className: "mx-2 text-slate-300",
                                children: "|"
                            }), u.jsx("button", {
                                type: "button",
                                onClick: () => U("find-password"),
                                className: "text-[13px] text-slate-400 hover:text-slate-600",
                                children: "비밀번호 찾기"
                            })]
                        })]
                    })]
                })]
            })
        }, "login")
    },
    g3 = ({
        initialDraft: a,
        backendBase: i,
        onBack: l,
        onSubmit: r,
        onGoHome: f
    }) => {
        const [d, m] = M.useState(0), [h, x] = M.useState(a), [y, g] = M.useState(!1), [b, S] = M.useState(""), [j, A] = M.useState(""), [G, Y] = M.useState(!1), [U, I] = M.useState([]), [P, W] = M.useState(!1), [se, he] = M.useState(null), [$, ne] = M.useState(() => qj(a.birthDate)), ce = Hj(a.email), [te, Me] = M.useState(ce.localPart), [Se, Fe] = M.useState(ce.domainOption), [ze, Ae] = M.useState(ce.customDomain), [O, E] = M.useState(!1), [ae, ge] = M.useState(!1), [Ne, T] = M.useState(null), [X, K] = M.useState(null), [re, ye] = M.useState(""), [Te, we] = M.useState(!1), Le = 6, Ee = "flex h-11 flex-1 items-center gap-3 overflow-hidden rounded-lg border border-orange-100 bg-white px-4", yt = "h-full w-full bg-transparent text-sm outline-none", Zt = "inline-flex h-11 items-center justify-center rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-60", zt = "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-orange-200 bg-white px-4 text-sm font-semibold text-orange-600 shadow-sm transition hover:bg-orange-50", jt = "inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-orange-50 hover:text-orange-500", Ve = (R, fe) => {
            x(De => ({
                ...De,
                [R]: fe
            })), j && A("")
        }, We = R => {
            const fe = R.localPart ?? te,
                De = R.domainOption ?? Se,
                Je = R.customDomain ?? ze;
            K(null), ye(""), Ve("email", D0({
                localPart: fe,
                domainOption: De,
                customDomain: Je
            }))
        }, Ce = async () => {
            const R = D0({
                localPart: te,
                domainOption: Se,
                customDomain: ze
            });
            if (!R || !R.includes("@")) {
                K("unavailable"), ye("완전한 이메일을 입력해주세요.");
                return
            }
            we(!0), K(null), ye("");
            try {
                const De = await (await fetch(`${i}/api/mobile/check-email`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: R
                    })
                })).json();
                De.available ? (K("available"), ye(De.message || "사용 가능한 이메일입니다.")) : (K("unavailable"), ye(De.message || "이미 가입된 이메일입니다."))
            } catch {
                K("unavailable"), ye("서버 연결에 실패했습니다.")
            } finally {
                we(!1)
            }
        }, _t = R => {
            const fe = new Map;
            return R.filter(De => De.role === "medical" && De.accountStatus === "active").forEach(De => {
                var Zn, qt, ja;
                const Je = String(((Zn = De.affiliation) == null ? void 0 : Zn.city) || "").trim(),
                    wt = String(((qt = De.affiliation) == null ? void 0 : qt.district) || "").trim(),
                    Hn = String(((ja = De.affiliation) == null ? void 0 : ja.dong) || "").trim(),
                    Mn = String(De.name || "").trim();
                if (!Je || !wt || !Hn || !Mn) return;
                const Na = [Je, wt, Hn, Mn].join("||");
                fe.set(Na, {
                    city: Je,
                    district: wt,
                    dong: Hn,
                    welfareName: Mn
                })
            }), Array.from(fe.values()).sort((De, Je) => {
                const wt = [De.city, De.district, De.dong, De.welfareName].join(" "),
                    Hn = [Je.city, Je.district, Je.dong, Je.welfareName].join(" ");
                return wt.localeCompare(Hn, "ko")
            })
        }, Nn = M.useCallback(async () => {
            W(!0);
            try {
                const fe = await (await fetch(`${i}/api/controllers`)).json().catch(() => null),
                    De = Array.isArray(fe == null ? void 0 : fe.data) ? _t(fe.data) : [];
                I(De)
            } catch {
                I([])
            } finally {
                W(!1)
            }
        }, [i]);
        M.useEffect(() => {
            Nn()
        }, [Nn]);
        const jn = () => {
                const R = Ox(h.name),
                    fe = vl(h.phone),
                    De = String(h.email || "").trim().toLowerCase(),
                    Je = String(h.password || ""),
                    wt = String(h.passwordConfirm || "");
                return {
                    name: R.length === 0 ? "이름을 입력해주세요." : Vj(R) ? "" : "이름은 한글 또는 영문 2~20자로 입력해주세요.",
                    phone: fe.length === 0 ? "휴대폰 번호를 입력해주세요." : fe.length < 10 ? "휴대폰 번호를 정확히 입력해주세요." : "",
                    email: De.length === 0 ? "이메일을 입력해주세요." : Lj(De) ? "" : "올바른 이메일 형식이 아닙니다.",
                    password: Je.length === 0 ? "비밀번호를 입력해주세요." : "",
                    passwordConfirm: wt.length === 0 ? "비밀번호 확인을 입력해주세요." : Je !== wt ? "비밀번호가 일치하지 않습니다." : ""
                }
            },
            Yt = (R, fe) => fe ? G ? !0 : String(R || "").trim().length > 0 : !1,
            Ye = () => ({
                city: h.city.trim() ? "" : "시도를 선택해주세요.",
                district: h.district.trim() ? "" : "시군구를 선택해주세요.",
                dong: h.dong.trim() ? "" : "동명을 선택해주세요.",
                welfareName: h.welfareName.trim() ? "" : "담당자를 선택해주세요."
            }),
            on = Cx.map(R => R.name).sort((R, fe) => R.localeCompare(fe, "ko")),
            li = Dx(h.city).map(R => R.name).sort((R, fe) => R.localeCompare(fe, "ko")),
            pt = [...Aj(h.city, h.district)].sort((R, fe) => R.localeCompare(fe, "ko")),
            ri = Zj(U, {
                city: h.city,
                district: h.district,
                dong: h.dong
            }),
            oi = kj(),
            Vi = Array.from({
                length: 12
            }, (R, fe) => String(fe + 1).padStart(2, "0")),
            Ta = O0($.year, $.month),
            aa = R => R === "city" ? h.city || "시도 선택" : R === "district" ? h.district || "시군구 선택" : R === "dong" ? h.dong || "동명 선택" : h.welfareName || "담당자 선택",
            Bn = R => R === "city" ? on : R === "district" ? li : R === "dong" ? pt : ri,
            Bi = R => P ? !0 : R === "city" ? on.length === 0 : R === "district" ? !h.city || li.length === 0 : R === "dong" ? !h.district || pt.length === 0 : !h.dong || ri.length === 0,
            Un = (R, fe) => {
                x(De => R === "city" ? {
                    ...De,
                    city: fe,
                    district: "",
                    dong: "",
                    welfareName: ""
                } : R === "district" ? {
                    ...De,
                    district: fe,
                    dong: "",
                    welfareName: ""
                } : R === "dong" ? {
                    ...De,
                    dong: fe,
                    welfareName: ""
                } : {
                    ...De,
                    welfareName: fe
                }), he(null)
            },
            ie = (R, fe) => {
                ne(De => {
                    const Je = {
                        ...De,
                        [R]: fe
                    };
                    return (R === "year" || R === "month") && Je.day && (O0(Je.year, Je.month).includes(Je.day) || (Je.day = "")), Ve("birthDate", Xj(Je)), Je
                })
            },
            Mt = (R, fe, De, Je) => u.jsxs("label", {
                className: "block",
                children: [u.jsx("div", {
                    className: "mb-2 text-xs font-bold uppercase tracking-widest text-slate-400",
                    children: fe
                }), u.jsxs("button", {
                    type: "button",
                    onClick: () => he(R),
                    disabled: Bi(R),
                    className: "relative flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
                    children: [Je === "map" && u.jsx(cg, {
                        size: 16,
                        className: "shrink-0 text-orange-500"
                    }), u.jsx("span", {
                        className: "flex-1 text-sm font-medium text-slate-800",
                        children: aa(R)
                    }), u.jsx(Y0, {
                        size: 18,
                        className: "shrink-0 text-orange-500"
                    })]
                }), G && De && u.jsx("p", {
                    className: "mt-2 text-xs text-rose-500",
                    children: De
                })]
            }),
            Ke = R => u.jsxs("div", {
                className: "mb-2 flex items-center gap-1.5",
                children: [u.jsx("span", {
                    className: "text-xs font-bold uppercase tracking-widest text-slate-400",
                    children: R
                }), u.jsx("span", {
                    className: "text-[11px] font-semibold text-rose-400",
                    children: "*"
                })]
            }),
            Lt = () => {
                if (d === 0) return h.agreedService && h.agreedPrivacy && h.agreedLocation && h.agreedBiometric && h.agreedThirdParty && h.agreedWearable;
                if (d === 1) {
                    const R = jn();
                    return !R.name && !R.phone && !R.email && !R.password && !R.passwordConfirm
                }
                return d === 2 ? !P && h.city.trim() && h.district.trim() && h.dong.trim() && h.welfareName.trim() : d === 3 ? h.birthDate.trim() && h.bloodType.trim() && Number(h.height) > 0 && Number(h.weight) > 0 : !0
            },
            ci = async () => {
                if (!Lt()) {
                    Y(!0), A("필수 항목을 입력해주세요.");
                    return
                }
                if (d < Le - 2) {
                    Y(!1), A(""), m(fe => fe + 1);
                    return
                }
                A(""), g(!0);
                const R = await r(h);
                if (g(!1), R) {
                    A(R);
                    return
                }
                S("회원가입이 완료되었습니다. 관리자 검토 승인 후 로그인할 수 있습니다."), A(""), m(Le - 1)
            }, ia = () => {
                if (d <= 0) {
                    l();
                    return
                }
                Y(!1), A(""), m(R => R - 1)
            }, an = jn(), St = Ye();
        return u.jsxs(st.div, {
            initial: {
                opacity: 0,
                y: 10
            },
            animate: {
                opacity: 1,
                y: 0
            },
            exit: {
                opacity: 0,
                y: -10
            },
            className: "space-y-4 pb-10 pt-6",
            children: [u.jsxs("header", {
                className: "rounded-lg border border-orange-100 bg-white px-4 py-4 shadow-sm",
                children: [u.jsxs("div", {
                    className: "flex items-center justify-between gap-3",
                    children: [u.jsxs("div", {
                        children: [u.jsx("p", {
                            className: "text-xs font-bold uppercase tracking-[0.18em] text-orange-500",
                            children: "회원가입"
                        }), u.jsxs("h1", {
                            className: "mt-2 text-[22px] font-semibold tracking-[-0.02em] text-slate-900",
                            children: [d === 0 && "약관동의", d === 1 && "계정정보", d === 2 && "소속등록", d === 3 && "기초정보", d === 4 && "보호자/건강정보", d === 5 && "가입완료"]
                        })]
                    }), u.jsxs("div", {
                        className: "shrink-0 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600",
                        children: [d + 1, " / ", Le]
                    })]
                }), u.jsx("div", {
                    className: "mt-4 grid grid-cols-6 gap-1.5",
                    children: Array.from({
                        length: Le
                    }).map((R, fe) => u.jsx("div", {
                        className: `h-1.5 rounded-full ${fe<=d?"bg-orange-500":"bg-orange-100"}`
                    }, fe))
                })]
            }), d === 0 && u.jsxs("section", {
                className: "rounded-lg border border-orange-100 bg-white p-4 space-y-4",
                children: [u.jsxs("div", {
                    className: "flex items-center gap-2 pb-2 border-b border-orange-100",
                    children: [u.jsxs("label", {
                        className: "flex flex-1 items-center gap-2 cursor-pointer",
                        children: [u.jsx("input", {
                            type: "checkbox",
                            checked: h.agreedService && h.agreedPrivacy && h.agreedLocation && h.agreedBiometric && h.agreedThirdParty && h.agreedWearable,
                            onChange: R => {
                                Ve("agreedService", R.target.checked), Ve("agreedPrivacy", R.target.checked), Ve("agreedLocation", R.target.checked), Ve("agreedBiometric", R.target.checked), Ve("agreedThirdParty", R.target.checked), Ve("agreedWearable", R.target.checked)
                            },
                            className: "peer sr-only"
                        }), u.jsx("span", {
                            className: "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-colors",
                            children: u.jsx("svg", {
                                className: "h-3 w-3 text-white",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "3",
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                children: u.jsx("polyline", { points: "20 6 9 17 4 12" })
                            })
                        }), u.jsx("span", {
                            className: "text-[13px] font-semibold text-slate-900",
                            children: "필수 약관 모두 동의"
                        })]
                    })]
                }), u.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [u.jsxs("label", {
                        className: "flex flex-1 items-center gap-2 cursor-pointer",
                        children: [u.jsx("input", {
                            type: "checkbox",
                            checked: h.agreedService,
                            onChange: R => Ve("agreedService", R.target.checked),
                            className: "peer sr-only"
                        }), u.jsx("span", {
                            className: "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-colors",
                            children: u.jsx("svg", {
                                className: "h-3 w-3 text-white",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "3",
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                children: u.jsx("polyline", { points: "20 6 9 17 4 12" })
                            })
                        }), u.jsx("span", {
                            className: "text-[13px] text-slate-700",
                            children: "서비스 이용약관 동의 (필수)"
                        })]
                    }), u.jsx("button", {
                        type: "button",
                        onClick: () => T("service"),
                        className: "shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600",
                        "aria-label": "서비스 이용약관 보기",
                        children: "약관보기"
                    })]
                }), u.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [u.jsxs("label", {
                        className: "flex flex-1 items-center gap-2 cursor-pointer",
                        children: [u.jsx("input", {
                            type: "checkbox",
                            checked: h.agreedPrivacy,
                            onChange: R => Ve("agreedPrivacy", R.target.checked),
                            className: "peer sr-only"
                        }), u.jsx("span", {
                            className: "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-colors",
                            children: u.jsx("svg", {
                                className: "h-3 w-3 text-white",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "3",
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                children: u.jsx("polyline", { points: "20 6 9 17 4 12" })
                            })
                        }), u.jsx("span", {
                            className: "text-[13px] text-slate-700",
                            children: "개인정보 수집/이용 동의 (필수)"
                        })]
                    }), u.jsx("button", {
                        type: "button",
                        onClick: () => T("privacy"),
                        className: "shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600",
                        "aria-label": "개인정보 수집 및 이용 동의 보기",
                        children: "약관보기"
                    })]
                }), u.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [u.jsxs("label", {
                        className: "flex flex-1 items-center gap-2 cursor-pointer",
                        children: [u.jsx("input", {
                            type: "checkbox",
                            checked: h.agreedLocation,
                            onChange: R => Ve("agreedLocation", R.target.checked),
                            className: "peer sr-only"
                        }), u.jsx("span", {
                            className: "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-colors",
                            children: u.jsx("svg", {
                                className: "h-3 w-3 text-white",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "3",
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                children: u.jsx("polyline", { points: "20 6 9 17 4 12" })
                            })
                        }), u.jsx("span", {
                            className: "text-[13px] text-slate-700",
                            children: "위치정보 수집 및 이용 동의 (필수)"
                        })]
                    }), u.jsx("button", {
                        type: "button",
                        onClick: () => T("location"),
                        className: "shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600",
                        "aria-label": "위치정보 수집 및 이용 동의 보기",
                        children: "약관보기"
                    })]
                }), u.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [u.jsxs("label", {
                        className: "flex flex-1 items-center gap-2 cursor-pointer",
                        children: [u.jsx("input", {
                            type: "checkbox",
                            checked: h.agreedBiometric,
                            onChange: R => Ve("agreedBiometric", R.target.checked),
                            className: "peer sr-only"
                        }), u.jsx("span", {
                            className: "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-colors",
                            children: u.jsx("svg", {
                                className: "h-3 w-3 text-white",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "3",
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                children: u.jsx("polyline", { points: "20 6 9 17 4 12" })
                            })
                        }), u.jsx("span", {
                            className: "text-[13px] text-slate-700",
                            children: "생체데이터 수집 및 이용 동의 (필수)"
                        })]
                    }), u.jsx("button", {
                        type: "button",
                        onClick: () => T("biometric"),
                        className: "shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600",
                        "aria-label": "생체데이터 수집 및 이용 동의 보기",
                        children: "약관보기"
                    })]
                }), u.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [u.jsxs("label", {
                        className: "flex flex-1 items-center gap-2 cursor-pointer",
                        children: [u.jsx("input", {
                            type: "checkbox",
                            checked: h.agreedThirdParty,
                            onChange: R => Ve("agreedThirdParty", R.target.checked),
                            className: "peer sr-only"
                        }), u.jsx("span", {
                            className: "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-colors",
                            children: u.jsx("svg", {
                                className: "h-3 w-3 text-white",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "3",
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                children: u.jsx("polyline", { points: "20 6 9 17 4 12" })
                            })
                        }), u.jsx("span", {
                            className: "text-[13px] text-slate-700",
                            children: "제3자 정보 제공 동의 (필수)"
                        })]
                    }), u.jsx("button", {
                        type: "button",
                        onClick: () => T("thirdParty"),
                        className: "shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600",
                        "aria-label": "제3자 정보 제공 동의 보기",
                        children: "약관보기"
                    })]
                }), u.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [u.jsxs("label", {
                        className: "flex flex-1 items-center gap-2 cursor-pointer",
                        children: [u.jsx("input", {
                            type: "checkbox",
                            checked: h.agreedWearable,
                            onChange: R => Ve("agreedWearable", R.target.checked),
                            className: "peer sr-only"
                        }), u.jsx("span", {
                            className: "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-colors",
                            children: u.jsx("svg", {
                                className: "h-3 w-3 text-white",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "3",
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                children: u.jsx("polyline", { points: "20 6 9 17 4 12" })
                            })
                        }), u.jsx("span", {
                            className: "text-[13px] text-slate-700",
                            children: "웨어러블 기기 연동 서비스 이용약관 (필수)"
                        })]
                    }), u.jsx("button", {
                        type: "button",
                        onClick: () => T("wearable"),
                        className: "shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600",
                        "aria-label": "웨어러블 기기 연동 서비스 이용약관 보기",
                        children: "약관보기"
                    })]
                })]
            }), d === 1 && u.jsxs("section", {
                className: "space-y-4 rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                children: [u.jsx("div", {
                    className: "text-sm text-slate-500",
                    children: "계정정보를 입력해 주세요. 필수 항목은 반드시 입력해야 합니다."
                }), u.jsxs("label", {
                    className: "block",
                    children: [Ke("이름"), u.jsxs("div", {
                        className: Ee,
                        children: [u.jsx(Mo, {
                            size: 16,
                            className: "text-orange-500"
                        }), u.jsx("input", {
                            value: h.name,
                            onChange: R => Ve("name", R.target.value),
                            placeholder: "이름 입력",
                            className: yt,
                            autoComplete: "off"
                        })]
                    }), Yt(h.name, an.name) && u.jsx("p", {
                        className: "mt-2 text-xs text-rose-500",
                        children: an.name
                    })]
                }), u.jsxs("label", {
                    className: "block",
                    children: [Ke("휴대폰 본인확인"), u.jsxs("div", {
                        className: "mt-1 flex items-center gap-2",
                        children: [u.jsxs("div", {
                            className: Ee,
                            children: [u.jsx(ff, {
                                size: 16,
                                className: "text-orange-500"
                            }), u.jsx("input", {
                                value: h.phone,
                                onChange: R => Ve("phone", ni(R.target.value)),
                                placeholder: "010-0000-0000",
                                className: yt,
                                inputMode: "numeric"
                            })]
                        }), u.jsxs("button", {
                            type: "button",
                            className: zt,
                            children: [u.jsx(q0, {
                                size: 16
                            }), "휴대폰 본인인증"]
                        })]
                    }), Yt(h.phone, an.phone) && u.jsx("p", {
                        className: "mt-2 text-xs text-rose-500",
                        children: an.phone
                    })]
                }), u.jsxs("label", {
                    className: "block",
                    children: [Ke("이메일 아이디"), u.jsxs("div", {
                        className: "space-y-3",
                        children: [u.jsxs("div", {
                            className: "flex h-11 items-center gap-3 overflow-hidden rounded-lg border border-orange-100 bg-white px-4",
                            children: [u.jsx(uf, {
                                size: 16,
                                className: "text-orange-500"
                            }), u.jsx("input", {
                                value: te,
                                onChange: R => {
                                    const fe = R.target.value.replace(/\s/g, "").toLowerCase();
                                    Me(fe), We({
                                        localPart: fe
                                    })
                                },
                                placeholder: "아이디 입력",
                                className: yt,
                                inputMode: "email",
                                autoComplete: "off"
                            }), u.jsx("span", {
                                className: "text-sm font-semibold text-slate-400",
                                children: "@"
                            })]
                        }), u.jsxs("div", {
                            className: "flex h-11 items-center gap-2 overflow-hidden rounded-lg border border-orange-100 bg-white px-4",
                            children: [u.jsxs("select", {
                                value: Se,
                                onChange: R => {
                                    const fe = R.target.value;
                                    if (Fe(fe), fe !== "custom") {
                                        Ae(""), We({
                                            domainOption: fe,
                                            customDomain: ""
                                        });
                                        return
                                    }
                                    We({
                                        domainOption: fe
                                    })
                                },
                                className: "flex-1 min-w-0 h-full bg-transparent text-sm outline-none border-0",
                                children: [u.jsx("option", {
                                    value: "",
                                    children: "메일 선택"
                                }), Rx.map(R => u.jsx("option", {
                                    value: R,
                                    children: R
                                }, R)), u.jsx("option", {
                                    value: "custom",
                                    children: "직접 입력"
                                })]
                            }), Se === "custom" ? u.jsx("input", {
                                value: ze,
                                onChange: R => {
                                    const fe = R.target.value.replace(/\s/g, "").toLowerCase();
                                    Ae(fe), We({
                                        customDomain: fe
                                    })
                                },
                                placeholder: "도메인 직접 입력",
                                className: "flex-1 min-w-0 h-full bg-transparent text-sm outline-none border-0",
                                inputMode: "email",
                                autoComplete: "off"
                            }) : null, u.jsxs("button", {
                                type: "button",
                                onClick: Ce,
                                disabled: Te,
                                className: "inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-orange-100 px-2.5 text-[11px] font-semibold text-orange-600 transition hover:bg-orange-200 active:scale-95 disabled:opacity-50",
                                children: [Te ? u.jsx(io, {
                                    size: 12,
                                    className: "animate-spin"
                                }) : null, "중복확인"]
                            })]
                        })]
                    }), re ? u.jsx("p", {
                        className: `mt-1 text-[12px] ${X==="available"?"text-emerald-600":"text-rose-500"}`,
                        children: re
                    }) : null, Yt(h.email, an.email) && u.jsx("p", {
                        className: "mt-2 text-xs text-rose-500",
                        children: an.email
                    })]
                }), u.jsxs("label", {
                    className: "block",
                    children: [Ke("비밀번호"), u.jsxs("div", {
                        className: Ee,
                        children: [u.jsx(Tl, {
                            size: 16,
                            className: "text-orange-500"
                        }), u.jsx("input", {
                            type: O ? "text" : "password",
                            value: h.password,
                            onChange: R => Ve("password", R.target.value),
                            placeholder: "비밀번호 입력",
                            className: yt,
                            autoComplete: "new-password"
                        }), h.password ? u.jsx("button", {
                            type: "button",
                            onClick: () => Ve("password", ""),
                            className: jt,
                            "aria-label": "비밀번호 지우기",
                            children: u.jsx(vs, {
                                size: 14
                            })
                        }) : null, u.jsx("button", {
                            type: "button",
                            onClick: () => E(R => !R),
                            className: jt,
                            "aria-label": O ? "비밀번호 숨기기" : "비밀번호 보기",
                            children: O ? u.jsx(bl, {
                                size: 16
                            }) : u.jsx(Sl, {
                                size: 16
                            })
                        })]
                    }), Yt(h.password, an.password) && u.jsx("p", {
                        className: "mt-2 text-xs text-rose-500",
                        children: an.password
                    })]
                }), u.jsxs("label", {
                    className: "block",
                    children: [Ke("비밀번호 확인"), u.jsxs("div", {
                        className: Ee,
                        children: [u.jsx(Tl, {
                            size: 16,
                            className: "text-orange-500"
                        }), u.jsx("input", {
                            type: ae ? "text" : "password",
                            value: h.passwordConfirm,
                            onChange: R => Ve("passwordConfirm", R.target.value),
                            placeholder: "비밀번호 한번 더 입력",
                            className: yt,
                            autoComplete: "new-password"
                        }), h.passwordConfirm ? u.jsx("button", {
                            type: "button",
                            onClick: () => Ve("passwordConfirm", ""),
                            className: jt,
                            "aria-label": "비밀번호 확인 지우기",
                            children: u.jsx(vs, {
                                size: 14
                            })
                        }) : null, u.jsx("button", {
                            type: "button",
                            onClick: () => ge(R => !R),
                            className: jt,
                            "aria-label": ae ? "비밀번호 확인 숨기기" : "비밀번호 확인 보기",
                            children: ae ? u.jsx(bl, {
                                size: 16
                            }) : u.jsx(Sl, {
                                size: 16
                            })
                        })]
                    }), Yt(h.passwordConfirm, an.passwordConfirm) && u.jsx("p", {
                        className: "mt-2 text-xs text-rose-500",
                        children: an.passwordConfirm
                    })]
                })]
            }), d === 2 && u.jsxs("section", {
                className: "space-y-4 rounded-lg border-2 border-orange-200 bg-orange-50/40 p-5 shadow-sm",
                children: [u.jsxs("div", {
                    className: "flex items-center gap-2 text-sm font-semibold text-orange-700",
                    children: [u.jsx(cg, {
                        size: 16
                    }), "지역 소속"]
                }), u.jsx("div", {
                    className: "text-xs text-slate-500",
                    children: "실제 등록된 담당 복지사 기준으로 소속(지역)을 선택해 주세요. 이 단계 항목은 모두 필수입니다."
                }), P && u.jsx("div", {
                    className: "rounded-lg border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-slate-600",
                    children: "소속 정보를 불러오는 중입니다."
                }), !P && U.length === 0 && u.jsx("div", {
                    className: "rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600",
                    children: "선택 가능한 소속 정보가 아직 등록되지 않았습니다."
                }), u.jsxs("div", {
                    className: "space-y-3",
                    children: [Mt("city", "시도", St.city, "map"), Mt("district", "시군구", St.district), Mt("dong", "동명", St.dong), Mt("welfareName", "담당자", St.welfareName)]
                })]
            }), u.jsx(Rl, {
                children: se && u.jsxs(u.Fragment, {
                    children: [u.jsx(st.button, {
                        type: "button",
                        initial: {
                            opacity: 0
                        },
                        animate: {
                            opacity: 1
                        },
                        exit: {
                            opacity: 0
                        },
                        onClick: () => he(null),
                        className: "fixed inset-0 z-40 bg-slate-900/40"
                    }), u.jsxs(st.section, {
                        initial: {
                            opacity: 0,
                            y: 20
                        },
                        animate: {
                            opacity: 1,
                            y: 0
                        },
                        exit: {
                            opacity: 0,
                            y: 20
                        },
                        className: "fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] border border-orange-100 bg-white px-5 pb-6 pt-5 shadow-[0_-10px_40px_rgba(15,23,42,0.16)]",
                        children: [u.jsx("div", {
                            className: "mx-auto mb-4 h-1.5 w-12 rounded-full bg-orange-100"
                        }), u.jsx("div", {
                            className: "text-sm font-semibold text-slate-900",
                            children: aa(se)
                        }), u.jsx("div", {
                            className: "mt-1 text-xs text-slate-500",
                            children: "선택할 항목을 눌러주세요."
                        }), u.jsx("div", {
                            className: "mt-4 max-h-[45vh] space-y-2 overflow-y-auto",
                            children: Bn(se).map(R => {
                                const fe = aa(se) === R;
                                return u.jsxs("button", {
                                    type: "button",
                                    onClick: () => Un(se, R),
                                    className: `flex w-full items-center justify-between rounded-lg border px-4 py-4 text-left text-sm ${fe?"border-orange-300 bg-orange-50 text-orange-700":"border-orange-100 bg-white text-slate-700"}`,
                                    children: [u.jsx("span", {
                                        children: R
                                    }), fe && u.jsx(rg, {
                                        size: 18,
                                        className: "text-orange-500"
                                    })]
                                }, R)
                            })
                        }), Bn(se).length === 0 && u.jsx("div", {
                            className: "mt-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600",
                            children: "선택 가능한 항목이 없습니다."
                        })]
                    })]
                })
            }), d === 3 && u.jsxs("section", {
                className: "space-y-4 rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                children: [u.jsx("div", {
                    className: "text-sm text-slate-500",
                    children: "기초정보를 선택해 주세요. 이 단계 항목은 모두 필수입니다."
                }), u.jsxs("label", {
                    className: "block",
                    children: [Ke("생년월일"), u.jsxs("div", {
                        className: "grid grid-cols-3 gap-3",
                        children: [u.jsx("div", {
                            className: "rounded-lg border border-orange-100 px-4 py-3",
                            children: u.jsxs("select", {
                                value: $.year,
                                onChange: R => ie("year", R.target.value),
                                className: "w-full bg-transparent text-sm outline-none",
                                children: [u.jsx("option", {
                                    value: "",
                                    children: "연도 선택"
                                }), oi.map(R => u.jsxs("option", {
                                    value: R,
                                    children: [R, "년"]
                                }, R))]
                            })
                        }), u.jsx("div", {
                            className: "rounded-lg border border-orange-100 px-4 py-3",
                            children: u.jsxs("select", {
                                value: $.month,
                                onChange: R => ie("month", R.target.value),
                                className: "w-full bg-transparent text-sm outline-none",
                                children: [u.jsx("option", {
                                    value: "",
                                    children: "월 선택"
                                }), Vi.map(R => u.jsxs("option", {
                                    value: R,
                                    children: [Number(R), "월"]
                                }, R))]
                            })
                        }), u.jsx("div", {
                            className: "rounded-lg border border-orange-100 px-4 py-3",
                            children: u.jsxs("select", {
                                value: $.day,
                                onChange: R => ie("day", R.target.value),
                                className: "w-full bg-transparent text-sm outline-none",
                                disabled: !$.year || !$.month,
                                children: [u.jsx("option", {
                                    value: "",
                                    children: "일 선택"
                                }), Ta.map(R => u.jsxs("option", {
                                    value: R,
                                    children: [Number(R), "일"]
                                }, R))]
                            })
                        })]
                    })]
                }), u.jsxs("label", {
                    className: "block",
                    children: [Ke("혈액형"), u.jsx("div", {
                        className: "rounded-lg border border-orange-100 px-4 py-3",
                        children: u.jsxs("select", {
                            value: h.bloodType,
                            onChange: R => Ve("bloodType", R.target.value),
                            className: "w-full bg-transparent text-sm outline-none",
                            children: [u.jsx("option", {
                                value: "",
                                children: "혈액형 선택"
                            }), Rj.map(R => u.jsxs("option", {
                                value: R,
                                children: [R, "형"]
                            }, R))]
                        })
                    })]
                }), u.jsxs("div", {
                    className: "grid grid-cols-2 gap-3",
                    children: [u.jsxs("label", {
                        className: "block",
                        children: [Ke("신장"), u.jsx("div", {
                            className: "rounded-lg border border-orange-100 px-4 py-3",
                            children: u.jsx("select", {
                                value: h.height,
                                onChange: R => Ve("height", R.target.value),
                                className: "w-full bg-transparent text-sm outline-none",
                                children: Oj.map(R => u.jsxs("option", {
                                    value: R,
                                    children: [R, "cm"]
                                }, R))
                            })
                        })]
                    }), u.jsxs("label", {
                        className: "block",
                        children: [Ke("체중"), u.jsx("div", {
                            className: "rounded-lg border border-orange-100 px-4 py-3",
                            children: u.jsx("select", {
                                value: h.weight,
                                onChange: R => Ve("weight", R.target.value),
                                className: "w-full bg-transparent text-sm outline-none",
                                children: zj.map(R => u.jsxs("option", {
                                    value: R,
                                    children: [R, "kg"]
                                }, R))
                            })
                        })]
                    })]
                })]
            }), d === 4 && u.jsxs("section", {
                className: "space-y-4 rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                children: [u.jsx("div", {
                    className: "text-sm text-slate-500",
                    children: "보호자 정보와 건강 메모를 함께 입력해 주세요."
                }), u.jsx("div", {
                    className: "rounded-lg border border-orange-100 bg-orange-50/60 px-4 py-3 text-sm text-slate-600",
                    children: "보호자 정보와 건강 메모는 모두 선택 입력입니다."
                }), u.jsxs("label", {
                    className: "block",
                    children: [u.jsx("div", {
                        className: "mb-2 text-xs font-bold uppercase tracking-widest text-slate-400",
                        children: "이름"
                    }), u.jsx("div", {
                        className: "rounded-lg border border-orange-100 px-4 py-3",
                        children: u.jsx("input", {
                            value: h.guardianName,
                            onChange: R => Ve("guardianName", R.target.value),
                            placeholder: "보호자 이름",
                            className: "w-full bg-transparent text-sm outline-none"
                        })
                    })]
                }), u.jsxs("label", {
                    className: "block",
                    children: [u.jsx("div", {
                        className: "mb-2 text-xs font-bold uppercase tracking-widest text-slate-400",
                        children: "휴대전화"
                    }), u.jsx("div", {
                        className: "rounded-lg border border-orange-100 px-4 py-3",
                        children: u.jsx("input", {
                            value: h.guardianPhone,
                            onChange: R => Ve("guardianPhone", ni(R.target.value)),
                            placeholder: "010-0000-0000",
                            className: "w-full bg-transparent text-sm outline-none",
                            inputMode: "numeric"
                        })
                    })]
                }), u.jsxs("label", {
                    className: "block",
                    children: [u.jsx("div", {
                        className: "mb-2 text-xs font-bold uppercase tracking-widest text-slate-400",
                        children: "관계"
                    }), u.jsx("div", {
                        className: "rounded-lg border border-orange-100 px-4 py-3",
                        children: u.jsx("input", {
                            value: h.guardianRelationship,
                            onChange: R => Ve("guardianRelationship", R.target.value),
                            placeholder: "예) 자녀",
                            className: "w-full bg-transparent text-sm outline-none"
                        })
                    })]
                }), u.jsxs("div", {
                    className: "border-t border-orange-100 pt-4",
                    children: [u.jsx("div", {
                        className: "mb-3 text-sm font-semibold text-slate-900",
                        children: "건강 메모"
                    }), u.jsxs("div", {
                        className: "space-y-4",
                        children: [u.jsxs("label", {
                            className: "block",
                            children: [u.jsx("div", {
                                className: "mb-2 text-xs font-bold uppercase tracking-widest text-slate-400",
                                children: "기저 질환"
                            }), u.jsx("textarea", {
                                value: h.medicalConditions,
                                onChange: R => Ve("medicalConditions", R.target.value),
                                placeholder: "예) 고혈압, 당뇨",
                                className: "min-h-[88px] w-full resize-none rounded-lg border border-orange-100 px-4 py-3 text-sm outline-none",
                                maxLength: 300
                            })]
                        }), u.jsxs("label", {
                            className: "block",
                            children: [u.jsx("div", {
                                className: "mb-2 text-xs font-bold uppercase tracking-widest text-slate-400",
                                children: "복용 중인 약물"
                            }), u.jsx("input", {
                                value: h.medications,
                                onChange: R => Ve("medications", R.target.value),
                                placeholder: "예) 혈압약",
                                className: "w-full rounded-lg border border-orange-100 px-4 py-3 text-sm outline-none",
                                maxLength: 200
                            })]
                        }), u.jsxs("label", {
                            className: "block",
                            children: [u.jsx("div", {
                                className: "mb-2 text-xs font-bold uppercase tracking-widest text-slate-400",
                                children: "알레르기"
                            }), u.jsx("input", {
                                value: h.allergies,
                                onChange: R => Ve("allergies", R.target.value),
                                placeholder: "예) 견과류, 페니실린",
                                className: "w-full rounded-lg border border-orange-100 px-4 py-3 text-sm outline-none",
                                maxLength: 200
                            })]
                        })]
                    })]
                })]
            }), d === 5 && u.jsxs("section", {
                className: "rounded-lg border border-orange-100 bg-white p-6 text-center shadow-sm",
                children: [u.jsx("div", {
                    className: "mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500",
                    children: u.jsx(rg, {
                        size: 28
                    })
                }), u.jsx("h2", {
                    className: "mt-4 text-xl font-semibold text-slate-900",
                    children: "회원가입이 완료 되었습니다."
                }), u.jsx("p", {
                    className: "mt-2 text-sm leading-6 text-slate-500",
                    children: b || "관리자 검토 승인이 필요 합니다."
                }), u.jsx("div", {
                    className: "mt-6",
                    children: u.jsx("button", {
                        type: "button",
                        onClick: f || l,
                        className: `w-full ${Zt}`,
                        children: "메인으로 이동"
                    })
                })]
            }), d < Le - 1 && u.jsxs("div", {
                className: "space-y-3",
                children: [j ? u.jsx("div", {
                    className: "rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600",
                    children: j
                }) : null, u.jsxs("div", {
                    className: "grid grid-cols-2 gap-3",
                    children: [u.jsx("button", {
                        type: "button",
                        onClick: ia,
                        className: `w-full ${zt}`,
                        children: "이전"
                    }), u.jsx("button", {
                        type: "button",
                        onClick: () => void ci(),
                        disabled: y,
                        className: `w-full ${Zt}`,
                        children: y ? "처리 중..." : d === Le - 2 ? "가입 완료" : "다음"
                    })]
                })]
            }), u.jsx(Rl, {
                children: Ne && u.jsxs(u.Fragment, {
                    children: [u.jsx(st.button, {
                        type: "button",
                        initial: {
                            opacity: 0
                        },
                        animate: {
                            opacity: 1
                        },
                        exit: {
                            opacity: 0
                        },
                        onClick: () => T(null),
                        className: "fixed inset-0 z-40 bg-slate-900/45"
                    }), u.jsxs(st.section, {
                        initial: {
                            opacity: 0,
                            y: 20
                        },
                        animate: {
                            opacity: 1,
                            y: 0
                        },
                        exit: {
                            opacity: 0,
                            y: 20
                        },
                        className: "fixed inset-x-0 bottom-0 z-50 max-h-[78vh] overflow-hidden rounded-t-[28px] border border-slate-200 bg-white px-5 pb-6 pt-5 shadow-[0_-10px_40px_rgba(15,23,42,0.16)]",
                        children: [u.jsx("div", {
                            className: "mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200"
                        }), u.jsxs("div", {
                            className: "flex items-start justify-between gap-3",
                            children: [u.jsx("div", {
                                className: "flex-1 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm",
                                children: u.jsxs("div", {
                                    children: [u.jsx("div", {
                                        className: "text-[14px] font-bold tracking-[0.08em] text-slate-400",
                                        children: "개인정보 및 약관"
                                    }), u.jsx("div", {
                                        className: "mt-2 text-lg font-semibold text-slate-900",
                                        children: R0[Ne].title
                                    })]
                                })
                            }), u.jsx("button", {
                                type: "button",
                                onClick: () => T(null),
                                className: "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500",
                                "aria-label": "약관 닫기",
                                children: u.jsx(vs, {
                                    size: 16
                                })
                            })]
                        }), u.jsxs("div", {
                            className: "mt-4 max-h-[58vh] space-y-4 overflow-y-auto pr-1",
                            children: [u.jsxs("div", {
                                className: "grid grid-cols-3 gap-2",
                                children: [u.jsx("button", {
                                    type: "button",
                                    onClick: () => T("service"),
                                    className: `inline-flex h-9 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold shadow-sm transition ${Ne==="service"?"border-orange-200 bg-gradient-to-r from-orange-600 to-orange-500 text-white":"border-slate-200 bg-white text-slate-600"}`,
                                    children: "서비스 이용약관"
                                }), u.jsx("button", {
                                    type: "button",
                                    onClick: () => T("privacy"),
                                    className: `inline-flex h-9 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold shadow-sm transition ${Ne==="privacy"?"border-orange-200 bg-gradient-to-r from-orange-600 to-orange-500 text-white":"border-slate-200 bg-white text-slate-600"}`,
                                    children: "개인정보"
                                }), u.jsx("button", {
                                    type: "button",
                                    onClick: () => T("location"),
                                    className: `inline-flex h-9 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold shadow-sm transition ${Ne==="location"?"border-orange-200 bg-gradient-to-r from-orange-600 to-orange-500 text-white":"border-slate-200 bg-white text-slate-600"}`,
                                    children: "위치정보"
                                }), u.jsx("button", {
                                    type: "button",
                                    onClick: () => T("biometric"),
                                    className: `inline-flex h-9 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold shadow-sm transition ${Ne==="biometric"?"border-orange-200 bg-gradient-to-r from-orange-600 to-orange-500 text-white":"border-slate-200 bg-white text-slate-600"}`,
                                    children: "생체데이터"
                                }), u.jsx("button", {
                                    type: "button",
                                    onClick: () => T("thirdParty"),
                                    className: `inline-flex h-9 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold shadow-sm transition ${Ne==="thirdParty"?"border-orange-200 bg-gradient-to-r from-orange-600 to-orange-500 text-white":"border-slate-200 bg-white text-slate-600"}`,
                                    children: "제3자 제공"
                                }), u.jsx("button", {
                                    type: "button",
                                    onClick: () => T("wearable"),
                                    className: `inline-flex h-9 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold shadow-sm transition ${Ne==="wearable"?"border-orange-200 bg-gradient-to-r from-orange-600 to-orange-500 text-white":"border-slate-200 bg-white text-slate-600"}`,
                                    children: "기기 연동"
                                })]
                            }), u.jsxs("div", {
                                className: "rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm",
                                children: [u.jsx("div", {
                                    className: "text-[14px] font-bold tracking-[0.08em] text-slate-400",
                                    children: R0[Ne].title
                                }), u.jsx("div", {
                                    className: "mt-3.5 space-y-4",
                                    children: R0[Ne].sections.map(R => u.jsxs("div", {
                                        className: "rounded-lg border border-slate-200 bg-slate-50 px-4 py-4",
                                        children: [u.jsx("div", {
                                            className: "text-sm font-semibold text-slate-900",
                                            children: R.heading
                                        }), u.jsx("div", {
                                            className: "mt-2 space-y-2",
                                            children: R.body.map(fe => u.jsx("p", {
                                                className: "text-sm leading-6 text-slate-600",
                                                children: fe
                                            }, fe))
                                        })]
                                    }, R.heading))
                                })]
                            })]
                        })]
                    })]
                })
            })]
        }, "signup")
    },
    y3 = ({
        knownDevice: a,
        knownConnected: i,
        battery: l,
        bloodPressure: r,
        onSaveBloodPressure: f,
        deviceLabel: d,
        profileEmail: m,
        profilePhone: h,
        profileGender: x,
        profileBirthDate: y,
        profileBloodType: g,
        profileGuardian: b,
        onSaveDeviceLabel: S,
        medicalMemo: j,
        onLogout: A,
        onSaveBasicProfile: G,
        onIssueGuardianAccessCode: Y,
        onSaveMedicalMemo: U,
        onWithdrawAccount: I
    }) => {
        const [P, W] = M.useState(d || ""), [se, he] = M.useState("120"), [$, ne] = M.useState("80"), [ce, te] = M.useState(!1), [Me, Se] = M.useState(!1), [Fe, ze] = M.useState(!1), [Ae, O] = M.useState(m || ""), [E, ae] = M.useState(h || ""), [ge, Ne] = M.useState(b.name || ""), [T, X] = M.useState(b.phone || ""), [K, re] = M.useState(b.relationship || ""), [ye, Te] = M.useState(j.medicalConditions || ""), [we, Le] = M.useState(j.medications || ""), [Ee, yt] = M.useState(j.allergies || ""), [Zt, zt] = M.useState(""), jt = "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all active:scale-[0.98]", Ve = "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-4 text-sm font-semibold text-slate-700 transition-all active:scale-[0.98]", We = "w-full rounded-lg border border-orange-100 bg-white px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all";
        M.useEffect(() => {
            W(d || "")
        }, [d]), M.useEffect(() => {
            Te(j.medicalConditions || ""), Le(j.medications || ""), yt(j.allergies || "")
        }, [j.allergies, j.medicalConditions, j.medications]), M.useEffect(() => {
            Ne(b.name || ""), X(b.phone || ""), re(b.relationship || "")
        }, [b.name, b.phone, b.relationship]), M.useEffect(() => {
            O(m || "")
        }, [m]), M.useEffect(() => {
            ae(h || "")
        }, [h]);
        const Ce = () => {
                Te(j.medicalConditions || ""), Le(j.medications || ""), yt(j.allergies || ""), ze(!1)
            },
            _t = () => {
                O(m || ""), ae(h || ""), Ne(b.name || ""), X(b.phone || ""), re(b.relationship || ""), Se(!1)
            },
            Nn = () => {
                G({
                    email: Ae,
                    phone: E,
                    guardian: {
                        name: ge,
                        phone: T,
                        relationship: K
                    }
                }), Se(!1)
            },
            jn = () => {
                U({
                    medicalConditions: ye,
                    medications: we,
                    allergies: Ee
                }), ze(!1)
            };
        M.useEffect(() => {
            r && (he(String(r.systolic)), ne(String(r.diastolic)))
        }, [r == null ? void 0 : r.systolic, r == null ? void 0 : r.diastolic]);
        const Yt = () => {
            const Ye = Number(se),
                on = Number($);
            !Number.isFinite(Ye) || !Number.isFinite(on) || (te(!0), setTimeout(() => {
                f(Ye, on), te(!1), alert("혈압 데이터가 성공적으로 등록되었습니다.")
            }, 1e3))
        };
        return u.jsxs(st.div, {
            initial: {
                opacity: 0,
                y: 10
            },
            animate: {
                opacity: 1,
                y: 0
            },
            exit: {
                opacity: 0,
                y: -10
            },
            className: "space-y-4 pb-28 pt-6",
            children: [u.jsx("header", {
                className: "rounded-lg border border-orange-100 bg-white px-4 py-4 shadow-sm",
                children: u.jsxs("div", {
                    className: "flex items-center justify-between gap-3",
                    children: [u.jsx("h1", {
                        className: "text-[20px] font-semibold tracking-[-0.02em] text-slate-900",
                        children: "마이페이지"
                    }), u.jsx("button", {
                        type: "button",
                        onClick: A,
                        className: "inline-flex h-11 items-center justify-center rounded-lg border border-orange-100 bg-orange-50 px-4 text-sm font-semibold text-slate-700",
                        children: "로그아웃"
                    })]
                })
            }), u.jsxs("div", {
                className: "space-y-6",
                children: [u.jsx("h3", {
                    className: "text-xs font-bold text-on-surface-variant uppercase tracking-widest px-2",
                    children: "이름(관제 표시용)"
                }), u.jsxs("div", {
                    className: "space-y-4 rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                    children: [u.jsxs("div", {
                        className: "space-y-2",
                        children: [u.jsx("label", {
                            className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1",
                            children: "이름"
                        }), u.jsx("input", {
                            type: "text",
                            value: P,
                            onChange: Ye => W(Ye.target.value),
                            className: We,
                            placeholder: "예) 홍길동(1번)",
                            maxLength: 40
                        })]
                    }), u.jsx("button", {
                        onClick: () => S(P),
                        className: `w-full ${Ve}`,
                        children: u.jsx("span", {
                            children: "이름 저장"
                        })
                    })]
                })]
            }), u.jsxs("div", {
                className: "space-y-6",
                children: [u.jsxs("div", {
                    className: "flex items-center justify-between gap-3 px-2",
                    children: [u.jsx("h3", {
                        className: "text-xs font-bold text-on-surface-variant uppercase tracking-widest",
                        children: "기본 정보"
                    }), !Me && u.jsx("button", {
                        onClick: () => Se(!0),
                        className: Ve,
                        children: "수정"
                    })]
                }), u.jsxs("div", {
                    className: "rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                    children: [u.jsxs("div", {
                        className: "rounded-lg border border-primary/10 divide-y divide-primary/10 overflow-hidden",
                        children: [u.jsxs("div", {
                            className: "bg-white px-4 py-3 flex items-start gap-3",
                            children: [u.jsx(Mo, {
                                size: 16,
                                className: "mt-0.5 text-primary"
                            }), u.jsxs("div", {
                                children: [u.jsx("div", {
                                    className: "text-xs font-bold text-on-surface-variant",
                                    children: "이메일"
                                }), u.jsx("div", {
                                    className: "mt-1 text-sm font-medium text-on-surface",
                                    children: m || "-"
                                })]
                            })]
                        }), u.jsxs("div", {
                            className: "bg-white px-4 py-3",
                            children: [u.jsx("div", {
                                className: "text-xs font-bold text-on-surface-variant",
                                children: "전화번호"
                            }), u.jsx("div", {
                                className: "mt-1 text-sm font-medium text-on-surface",
                                children: h || "-"
                            })]
                        }), u.jsxs("div", {
                            className: "bg-white px-4 py-3",
                            children: [u.jsx("div", {
                                className: "text-xs font-bold text-on-surface-variant",
                                children: "성별"
                            }), u.jsx("div", {
                                className: "mt-1 text-sm font-medium text-on-surface",
                                children: x
                            })]
                        }), u.jsxs("div", {
                            className: "bg-white px-4 py-3",
                            children: [u.jsx("div", {
                                className: "text-xs font-bold text-on-surface-variant",
                                children: "생년월일"
                            }), u.jsx("div", {
                                className: "mt-1 text-sm font-medium text-on-surface",
                                children: y || "-"
                            })]
                        }), u.jsxs("div", {
                            className: "bg-white px-4 py-3",
                            children: [u.jsx("div", {
                                className: "text-xs font-bold text-on-surface-variant",
                                children: "혈액형"
                            }), u.jsx("div", {
                                className: "mt-1 text-sm font-medium text-on-surface",
                                children: g || "-"
                            })]
                        }), !Me && u.jsxs("div", {
                            className: "bg-white px-4 py-3",
                            children: [u.jsx("div", {
                                className: "text-xs font-bold text-on-surface-variant",
                                children: "보호자 정보"
                            }), u.jsx("div", {
                                className: "mt-1 text-sm font-medium text-on-surface",
                                children: b.name || b.relationship || b.phone ? [b.relationship, b.name, b.phone].filter(Boolean).join(" / ") : "없음"
                            }), u.jsx("button", {
                                type: "button",
                                onClick: Y,
                                className: "mt-3 inline-flex h-11 items-center justify-center rounded-lg border border-orange-100 bg-white px-4 text-sm font-semibold text-slate-700",
                                children: "인증코드 발급"
                            })]
                        })]
                    }), Me && u.jsxs("div", {
                        className: "mt-4 space-y-3",
                        children: [u.jsxs("div", {
                            className: "space-y-2",
                            children: [u.jsx("label", {
                                className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1",
                                children: "이메일"
                            }), u.jsx("input", {
                                type: "text",
                                value: Ae,
                                onChange: Ye => O(Ye.target.value.toLowerCase()),
                                className: We,
                                placeholder: "example@email.com",
                                maxLength: 100
                            })]
                        }), u.jsxs("div", {
                            className: "space-y-2",
                            children: [u.jsx("label", {
                                className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1",
                                children: "전화번호"
                            }), u.jsx("input", {
                                type: "text",
                                value: E,
                                onChange: Ye => ae(ni(Ye.target.value)),
                                className: We,
                                placeholder: "010-1234-5678",
                                maxLength: 30
                            })]
                        }), u.jsxs("div", {
                            className: "space-y-2",
                            children: [u.jsx("label", {
                                className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1",
                                children: "보호자 관계"
                            }), u.jsx("input", {
                                type: "text",
                                value: K,
                                onChange: Ye => re(Ye.target.value),
                                className: We,
                                placeholder: "예) 보호자",
                                maxLength: 30
                            })]
                        }), u.jsxs("div", {
                            className: "space-y-2",
                            children: [u.jsx("label", {
                                className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1",
                                children: "보호자 이름"
                            }), u.jsx("input", {
                                type: "text",
                                value: ge,
                                onChange: Ye => Ne(Ye.target.value),
                                className: We,
                                placeholder: "예) 홍길동",
                                maxLength: 40
                            })]
                        }), u.jsxs("div", {
                            className: "space-y-2",
                            children: [u.jsx("label", {
                                className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1",
                                children: "보호자 전화번호"
                            }), u.jsx("input", {
                                type: "text",
                                value: T,
                                onChange: Ye => X(ni(Ye.target.value)),
                                className: We,
                                placeholder: "예) 010-1234-5678",
                                maxLength: 30
                            })]
                        }), u.jsxs("div", {
                            className: "flex gap-3",
                            children: [u.jsx("button", {
                                onClick: _t,
                                className: `flex-1 ${Ve}`,
                                children: u.jsx("span", {
                                    children: "취소"
                                })
                            }), u.jsx("button", {
                                onClick: Nn,
                                className: `flex-1 ${jt} bg-primary text-white shadow-sm shadow-primary/20`,
                                children: u.jsx("span", {
                                    children: "저장"
                                })
                            })]
                        })]
                    })]
                })]
            }), u.jsxs("div", {
                className: "space-y-6",
                children: [u.jsxs("div", {
                    className: "flex items-center justify-between gap-3 px-2",
                    children: [u.jsx("h3", {
                        className: "text-xs font-bold text-on-surface-variant uppercase tracking-widest",
                        children: "건강메모"
                    }), !Fe && u.jsx("button", {
                        onClick: () => ze(!0),
                        className: Ve,
                        children: "수정"
                    })]
                }), u.jsxs("div", {
                    className: "space-y-4 rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                    children: [!Fe && u.jsxs("div", {
                        className: "rounded-lg border border-primary/10 divide-y divide-primary/10 overflow-hidden",
                        children: [u.jsxs("div", {
                            className: "bg-white px-4 py-3 flex items-start gap-3",
                            children: [u.jsx(ig, {
                                size: 16,
                                className: "mt-0.5 text-primary"
                            }), u.jsxs("div", {
                                children: [u.jsx("div", {
                                    className: "text-xs font-bold text-on-surface-variant",
                                    children: "기저 질환"
                                }), u.jsx("div", {
                                    className: "mt-1 text-sm font-medium text-on-surface",
                                    children: j.medicalConditions.trim() || "없음"
                                })]
                            })]
                        }), u.jsxs("div", {
                            className: "bg-white px-4 py-3 flex items-start gap-3",
                            children: [u.jsx(ug, {
                                size: 16,
                                className: "mt-0.5 text-secondary"
                            }), u.jsxs("div", {
                                children: [u.jsx("div", {
                                    className: "text-xs font-bold text-on-surface-variant",
                                    children: "복용 중인 약물"
                                }), u.jsx("div", {
                                    className: "mt-1 text-sm font-medium text-on-surface",
                                    children: j.medications.trim() || "없음"
                                })]
                            })]
                        }), u.jsxs("div", {
                            className: "bg-white px-4 py-3 flex items-start gap-3",
                            children: [u.jsx(lg, {
                                size: 16,
                                className: "mt-0.5 text-amber-500"
                            }), u.jsxs("div", {
                                children: [u.jsx("div", {
                                    className: "text-xs font-bold text-on-surface-variant",
                                    children: "알레르기"
                                }), u.jsx("div", {
                                    className: "mt-1 text-sm font-medium text-on-surface",
                                    children: j.allergies.trim() || "없음"
                                })]
                            })]
                        })]
                    }), Fe && u.jsxs(u.Fragment, {
                        children: [u.jsxs("div", {
                            className: "space-y-2",
                            children: [u.jsx("label", {
                                className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1",
                                children: "기저 질환"
                            }), u.jsx("textarea", {
                                value: ye,
                                onChange: Ye => Te(Ye.target.value),
                                className: "min-h-[96px] w-full resize-none rounded-lg border border-orange-100 bg-white px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                                placeholder: "예) 고혈압, 당뇨, 심장질환",
                                maxLength: 300
                            })]
                        }), u.jsxs("div", {
                            className: "space-y-2",
                            children: [u.jsx("label", {
                                className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1",
                                children: "복용 중인 약물"
                            }), u.jsx("input", {
                                type: "text",
                                value: we,
                                onChange: Ye => Le(Ye.target.value),
                                className: We,
                                placeholder: "예) 아스피린, 혈압약",
                                maxLength: 200
                            })]
                        }), u.jsxs("div", {
                            className: "space-y-2",
                            children: [u.jsx("label", {
                                className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1",
                                children: "알레르기"
                            }), u.jsx("input", {
                                type: "text",
                                value: Ee,
                                onChange: Ye => yt(Ye.target.value),
                                className: We,
                                placeholder: "예) 페니실린, 견과류",
                                maxLength: 200
                            })]
                        }), u.jsxs("div", {
                            className: "rounded-lg border border-primary/10 divide-y divide-primary/10 overflow-hidden",
                            children: [u.jsxs("div", {
                                className: "bg-white px-4 py-3 flex items-start gap-3",
                                children: [u.jsx(ig, {
                                    size: 16,
                                    className: "mt-0.5 text-primary"
                                }), u.jsxs("div", {
                                    children: [u.jsx("div", {
                                        className: "text-xs font-bold text-on-surface-variant",
                                        children: "기저 질환"
                                    }), u.jsx("div", {
                                        className: "mt-1 text-sm font-medium text-on-surface",
                                        children: ye.trim() || "없음"
                                    })]
                                })]
                            }), u.jsxs("div", {
                                className: "bg-white px-4 py-3 flex items-start gap-3",
                                children: [u.jsx(ug, {
                                    size: 16,
                                    className: "mt-0.5 text-secondary"
                                }), u.jsxs("div", {
                                    children: [u.jsx("div", {
                                        className: "text-xs font-bold text-on-surface-variant",
                                        children: "복용 중인 약물"
                                    }), u.jsx("div", {
                                        className: "mt-1 text-sm font-medium text-on-surface",
                                        children: we.trim() || "없음"
                                    })]
                                })]
                            }), u.jsxs("div", {
                                className: "bg-white px-4 py-3 flex items-start gap-3",
                                children: [u.jsx(lg, {
                                    size: 16,
                                    className: "mt-0.5 text-amber-500"
                                }), u.jsxs("div", {
                                    children: [u.jsx("div", {
                                        className: "text-xs font-bold text-on-surface-variant",
                                        children: "알레르기"
                                    }), u.jsx("div", {
                                        className: "mt-1 text-sm font-medium text-on-surface",
                                        children: Ee.trim() || "없음"
                                    })]
                                })]
                            })]
                        }), u.jsxs("div", {
                            className: "flex gap-3",
                            children: [u.jsx("button", {
                                onClick: Ce,
                                className: `flex-1 ${Ve}`,
                                children: u.jsx("span", {
                                    children: "취소"
                                })
                            }), u.jsx("button", {
                                onClick: jn,
                                className: `flex-1 ${jt} bg-primary text-white shadow-sm shadow-primary/20`,
                                children: u.jsx("span", {
                                    children: "저장"
                                })
                            })]
                        })]
                    })]
                })]
            }), u.jsxs("div", {
                className: "space-y-6",
                children: [u.jsx("h3", {
                    className: "text-xs font-bold text-on-surface-variant uppercase tracking-widest px-2",
                    children: "혈압 데이터 수동 등록"
                }), u.jsxs("div", {
                    className: "space-y-6 rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                    children: [u.jsxs("div", {
                        className: "grid grid-cols-2 gap-6",
                        children: [u.jsxs("div", {
                            className: "space-y-2",
                            children: [u.jsx("label", {
                                className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1",
                                children: "수축기 (Systolic)"
                            }), u.jsxs("div", {
                                className: "relative",
                                children: [u.jsx("input", {
                                    type: "number",
                                    value: se,
                                    onChange: Ye => he(Ye.target.value),
                                    className: "w-full rounded-lg border border-orange-100 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                                    placeholder: "120"
                                }), u.jsx("span", {
                                    className: "absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant",
                                    children: "mmHg"
                                })]
                            })]
                        }), u.jsxs("div", {
                            className: "space-y-2",
                            children: [u.jsx("label", {
                                className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1",
                                children: "이완기 (Diastolic)"
                            }), u.jsxs("div", {
                                className: "relative",
                                children: [u.jsx("input", {
                                    type: "number",
                                    value: $,
                                    onChange: Ye => ne(Ye.target.value),
                                    className: "w-full rounded-lg border border-orange-100 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                                    placeholder: "80"
                                }), u.jsx("span", {
                                    className: "absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant",
                                    children: "mmHg"
                                })]
                            })]
                        })]
                    }), u.jsx("button", {
                        onClick: Yt,
                        disabled: ce,
                        className: `w-full ${jt} bg-primary text-white shadow-sm shadow-primary/20 disabled:opacity-50`,
                        children: ce ? u.jsx("div", {
                            className: "w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                        }) : u.jsxs(u.Fragment, {
                            children: [u.jsx(mb, {
                                size: 18,
                                fill: "currentColor"
                            }), u.jsx("span", {
                                children: "혈압 데이터 등록"
                            })]
                        })
                    })]
                })]
            }), u.jsxs("div", {
                className: "space-y-6",
                children: [u.jsx("h3", {
                    className: "text-xs font-bold text-on-surface-variant uppercase tracking-widest px-2",
                    children: "연동 기기 정보"
                }), u.jsxs("div", {
                    className: "space-y-6 rounded-lg border border-orange-100 bg-white p-5 shadow-sm",
                    children: [u.jsxs("div", {
                        className: "flex items-center justify-between",
                        children: [u.jsxs("div", {
                            className: "flex items-center gap-3",
                            children: [u.jsx("div", {
                                className: "w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary",
                                children: u.jsx(df, {
                                    size: 20
                                })
                            }), u.jsxs("div", {
                                children: [u.jsx("p", {
                                    className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider",
                                    children: "상태"
                                }), u.jsxs("div", {
                                    className: "flex items-center gap-1.5",
                                    children: [u.jsx("span", {
                                        className: `w-2 h-2 rounded-full ${i?"bg-secondary animate-pulse":"bg-on-surface-variant/30"}`
                                    }), u.jsx("span", {
                                        className: "font-bold text-on-surface",
                                        children: i ? "연결됨" : "연결 안됨"
                                    })]
                                })]
                            })]
                        }), u.jsxs("div", {
                            className: "text-right",
                            children: [u.jsx("p", {
                                className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider",
                                children: "모델"
                            }), u.jsx("p", {
                                className: "font-bold text-on-surface text-lg",
                                children: (a == null ? void 0 : a.name) ?? "Unknown"
                            })]
                        })]
                    }), u.jsxs("div", {
                        className: "pt-4 border-t border-surface-container-low flex justify-between items-center",
                        children: [u.jsx("span", {
                            className: "text-xs font-bold text-on-surface-variant",
                            children: "MAC 주소"
                        }), u.jsx("span", {
                            className: "font-mono text-xs font-bold text-on-surface",
                            children: (a == null ? void 0 : a.mac) ?? "--"
                        })]
                    }), u.jsxs("div", {
                        className: "pt-4 border-t border-surface-container-low flex justify-between items-center",
                        children: [u.jsx("span", {
                            className: "text-xs font-bold text-on-surface-variant",
                            children: "배터리"
                        }), u.jsx("span", {
                            className: "font-headline text-xs font-bold text-on-surface",
                            children: typeof(l == null ? void 0 : l.percent) == "number" ? `${l.percent}%${l.isCharging?" (충전중)":""}` : "--"
                        })]
                    })]
                })]
            }), u.jsxs("div", {
                className: "space-y-6",
                children: [u.jsx("h3", {
                    className: "text-xs font-bold text-on-surface-variant uppercase tracking-widest px-2",
                    children: "회원탈퇴"
                }), u.jsxs("div", {
                    className: "space-y-4 rounded-lg border border-rose-100 bg-white p-5 shadow-sm",
                    children: [u.jsx("p", {
                        className: "text-sm leading-6 text-slate-600",
                        children: "회원탈퇴 시 계정 상태가 해지로 변경되고 다시 로그인이 차단됩니다."
                    }), u.jsxs("div", {
                        className: "space-y-2",
                        children: [u.jsx("label", {
                            className: "text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1",
                            children: "비밀번호 확인"
                        }), u.jsx("input", {
                            type: "password",
                            value: Zt,
                            onChange: Ye => zt(Ye.target.value),
                            className: We,
                            placeholder: "회원탈퇴 확인용 비밀번호 입력"
                        })]
                    }), u.jsx("button", {
                        type: "button",
                        onClick: () => {
                            if (!Zt.trim()) {
                                alert("회원탈퇴를 위해 비밀번호를 입력해주세요.");
                                return
                            }
                            confirm("회원탈퇴 하시겠습니까? 탈퇴 후 다시 로그인할 수 없습니다.") && (I(Zt), zt(""))
                        },
                        className: "inline-flex h-11 w-full items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600",
                        children: "회원탈퇴"
                    })]
                })]
            })]
        }, "profile")
    },
    x3 = ({
        currentView: a,
        setView: i
    }) => u.jsxs("nav", {
        className: "fixed bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around rounded-t-[28px] border-t border-orange-100 bg-white/95 px-3 pb-safe shadow-[0_-8px_24px_rgba(251,146,60,0.12)] backdrop-blur-xl",
        children: [u.jsx("button", {
            onClick: () => i("home"),
            className: `flex flex-col items-center justify-center rounded-lg px-4 py-4 transition-all duration-300 ${a==="home"?"bg-orange-50 text-orange-600":"text-slate-500"}`,
            children: u.jsx(pb, {
                size: 24,
                fill: a === "home" ? "currentColor" : "none",
                fillOpacity: .2
            })
        }), u.jsx("button", {
            onClick: () => i("analysis"),
            className: `flex flex-col items-center justify-center rounded-lg px-4 py-4 transition-all duration-300 ${a==="analysis"?"bg-orange-50 text-orange-600":"text-slate-500"}`,
            children: u.jsx(G0, {
                size: 24,
                fill: a === "analysis" ? "currentColor" : "none",
                fillOpacity: .2
            })
        }), u.jsx("button", {
            onClick: () => i("profile"),
            className: `flex flex-col items-center justify-center rounded-lg px-4 py-4 transition-all duration-300 ${a==="profile"?"bg-orange-50 text-orange-600":"text-slate-500"}`,
            children: u.jsx(Mo, {
                size: 24,
                fill: a === "profile" ? "currentColor" : "none",
                fillOpacity: .2
            })
        })]
    });

function v3() {
    const a = Bf(),
        i = typeof(window == null ? void 0 : window.AndroidBridge) < "u",
        [l, r] = M.useState(() => C0()),
        [f, d] = M.useState(""),
        [m, h] = M.useState(() => C0() ? "home" : "login"),
        [x, y] = M.useState(null),
        [g, b] = M.useState(() => ({
            ...z0
        })),
        [S, j] = M.useState(() => [{
            timeMs: Date.now(),
            biometric: {
                ...z0
            },
            batteryPercent: ao == null ? void 0 : ao.percent
        }]),
        [A] = M.useState(() => {
            try {
                return String(localStorage.getItem("gt_zepp_user_id") || "").trim() || "69eaf3b7535aedea7e0385c6"
            } catch {
                return "69eaf3b7535aedea7e0385c6"
            }
        }),
        [G, Y] = M.useState(() => {
            try {
                return String(localStorage.getItem("gt_device_label") || "")
            } catch {
                return ""
            }
        }),
        [U, I] = M.useState(() => {
            try {
                const C = Number(localStorage.getItem("gt_bp_sys") || ""),
                    F = Number(localStorage.getItem("gt_bp_dia") || "");
                return !Number.isFinite(C) || !Number.isFinite(F) || C <= 0 || F <= 0 ? _0 : {
                    systolic: C,
                    diastolic: F
                }
            } catch {
                return _0
            }
        }),
        [P, W] = M.useState(() => {
            try {
                const C = localStorage.getItem("gt_medical_memo_v1");
                if (C) {
                    const ee = JSON.parse(C);
                    return {
                        medicalConditions: String((ee == null ? void 0 : ee.medicalConditions) || ""),
                        medications: String((ee == null ? void 0 : ee.medications) || ""),
                        allergies: String((ee == null ? void 0 : ee.allergies) || "")
                    }
                }
                return {
                    medicalConditions: String(localStorage.getItem("gt_health_memo") || "").trim(),
                    medications: "",
                    allergies: ""
                }
            } catch {
                return {
                    medicalConditions: "",
                    medications: "",
                    allergies: ""
                }
            }
        }),
        [se, he] = M.useState("미상"),
        [$, ne] = M.useState(""),
        [ce, te] = M.useState(""),
        [Me, Se] = M.useState("-"),
        [Fe, ze] = M.useState(""),
        [Ae, O] = M.useState(() => ({
            name: "",
            phone: "",
            relationship: ""
        })),
        [E, ae] = M.useState(() => ({
            ...Fj
        })),
        [ge, Ne] = M.useState(!1),
        [T, X] = M.useState(() => ({
            ...ao
        })),
        [K, re] = M.useState(() => ({
            isWear: !0,
            timeMs: Date.now() - 60 * 1e3
        })),
        [ye, Te] = M.useState(() => L0[0] || null),
        [we, Le] = M.useState(() => [...L0]),
        [Ee, yt] = M.useState(!1),
        [Zt, zt] = M.useState(null),
        jt = M.useRef(null),
        Ve = M.useRef(!1),
        We = M.useRef(null),
        Ce = M.useRef(new Set),
        _t = M.useRef(new Set),
        [Nn, jn] = M.useState(!1),
        Yt = M.useRef(null),
        Ye = M.useRef(null),
        on = M.useRef(0),
        li = M.useRef(null),
        pt = M.useRef([]),
        ri = M.useRef(0),
        oi = M.useRef(""),
        [Vi, Ta] = M.useState(() => Date.now()),
        aa = M.useRef(!1),
        [Bn, Bi] = M.useState(null),
        Un = M.useCallback(C => {
            const F = Date.now() + 2500;
            Bi({
                text: C,
                untilMs: F
            })
        }, []);
    M.useEffect(() => {
        if (!Bn) return;
        const C = Math.max(0, Bn.untilMs - Date.now()),
            F = window.setTimeout(() => {
                Bi(ee => ee && ee.untilMs <= Date.now() ? null : ee)
            }, C);
        return () => window.clearTimeout(F)
    }, [Bn]);
    const [ie, Mt] = M.useState(() => {
        try {
            const C = localStorage.getItem("gt_paired_device");
            if (!C) return null;
            const F = JSON.parse(C),
                ee = String((F == null ? void 0 : F.mac) ?? "");
            if (!ee) return null;
            const J = String((F == null ? void 0 : F.name) ?? "Unknown");
            return {
                mac: ee,
                name: J
            }
        } catch {
            return null
        }
    }), [Ke, Lt] = M.useState(() => {
        try {
            return localStorage.getItem("gt_connected") === "1"
        } catch {
            return !1
        }
    }), ci = M.useRef(""), ia = M.useRef(""), an = l.length > 0, St = !an && !f && m !== "signup" ? "login" : m, R = M.useCallback(() => {
        r(""), h("login"), Uj()
    }, []);
    M.useEffect(() => {
        if (!f || !Ke || !(ie != null && ie.mac)) {
            f || (ia.current = "");
            return
        }
        const C = String(ie.mac || "").trim();
        if (!C) return;
        const F = `${f}:${C}`;
        if (ia.current === F) return;
        ia.current = F;
        let ee = !1;
        return (async () => {
            try {
                const pe = await fetch(`${a}/api/mobile/wearable/connect`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${f}`
                        },
                        body: JSON.stringify({
                            deviceId: C,
                            deviceName: String(ie.name || "Amazfit").trim() || "Amazfit",
                            deviceType: "watch"
                        })
                    }),
                    q = await pe.json().catch(() => null);
                if (ee) return;
                if (!pe.ok || !(q != null && q.success)) {
                    ia.current = "", Un((q == null ? void 0 : q.message) || "워치 연결 저장에 실패했습니다.");
                    return
                }
                d(""), Un("회원가입 후 워치 연결이 완료되었습니다."), h("login")
            } catch {
                if (ee) return;
                ia.current = "", Un("워치 연결 저장 중 오류가 발생했습니다.")
            }
        })(), () => {
            ee = !0
        }
    }, [a, Ke, ie == null ? void 0 : ie.mac, ie == null ? void 0 : ie.name, Un, f]), M.useEffect(() => {
        if (!l) return;
        let C = !1;
        const F = async () => {
            var J;
            try {
                const pe = await fetch(`${a}/api/mobile/profile`, {
                        headers: {
                            Authorization: `Bearer ${l}`
                        }
                    }),
                    q = await pe.json().catch(() => null);
                if (C) return;
                if (pe.status === 401 || pe.status === 403 || !pe.ok || !(q != null && q.success)) {
                    R(), alert((q == null ? void 0 : q.message) || "로그인 세션이 만료되어 다시 로그인해주세요.");
                    return
                }
                const le = ((J = q == null ? void 0 : q.data) == null ? void 0 : J.user) || {};
                Y(String((le == null ? void 0 : le.name) || "").trim()), ne(String((le == null ? void 0 : le.email) || "").trim().toLowerCase()), te(ni(String((le == null ? void 0 : le.phone) || "").trim())), he(of(le == null ? void 0 : le.gender)), Se(cf(le == null ? void 0 : le.birthDate)), ze(String((le == null ? void 0 : le.bloodType) || "").trim()), O(yl(le == null ? void 0 : le.emergencyContact)), W(rf(le == null ? void 0 : le.medicalMemo))
            } catch {
                if (C) return
            }
        };
        F();
        const ee = window.setInterval(() => {
            F()
        }, 60 * 1e3);
        return () => {
            C = !0, window.clearInterval(ee)
        }
    }, [l, a, R]), M.useEffect(() => {
        var F;
        if (!i) return;
        const C = String((ie == null ? void 0 : ie.mac) || "").trim();
        if (!C || Ke) {
            ci.current = "";
            return
        }
        if (ci.current !== C) {
            ci.current = C;
            try {
                (F = window.AndroidBridge) == null || F.connectDevice(C)
            } catch {}
        }
    }, [i, Ke, ie == null ? void 0 : ie.mac]), M.useEffect(() => {
        if (!(ie != null && ie.mac)) return;
        let C = !1;
        return (async () => {
            var ee, J;
            try {
                const pe = await fetch(`${a}/api/mobile/device-profile?mac=${encodeURIComponent(String(ie.mac||"").trim())}`),
                    q = await pe.json().catch(() => null);
                if (!pe.ok || !(q != null && q.success) || !(q != null && q.data) || C) return;
                const le = q.data,
                    be = String((le == null ? void 0 : le.name) || "").trim(),
                    V = String((le == null ? void 0 : le.email) || "").trim().toLowerCase(),
                    Re = ni(String((le == null ? void 0 : le.phone) || "").trim()),
                    H = of(le == null ? void 0 : le.gender),
                    Be = cf(le == null ? void 0 : le.birthDate),
                    xe = String((le == null ? void 0 : le.bloodType) || "").trim(),
                    Xt = yl(le == null ? void 0 : le.emergencyContact),
                    gt = rf(le == null ? void 0 : le.medicalMemo),
                    oe = typeof((ee = le == null ? void 0 : le.manualBloodPressure) == null ? void 0 : ee.systolic) == "number" && typeof((J = le == null ? void 0 : le.manualBloodPressure) == null ? void 0 : J.diastolic) == "number" ? {
                        systolic: le.manualBloodPressure.systolic,
                        diastolic: le.manualBloodPressure.diastolic
                    } : null;
                Y(be), ne(V), te(Re), he(H), Se(Be), ze(xe), O(Xt), W(gt), oe && I(oe);
                try {
                    be && localStorage.setItem("gt_device_label", be), localStorage.setItem("gt_medical_memo_v1", JSON.stringify(gt)), oe && (localStorage.setItem("gt_bp_sys", String(oe.systolic)), localStorage.setItem("gt_bp_dia", String(oe.diastolic)))
                } catch {}
            } catch {}
        })(), () => {
            C = !0
        }
    }, [a, ie == null ? void 0 : ie.mac]);
    const fe = (G || (ie == null ? void 0 : ie.name) || "Amazfit").trim(),
        De = Cj(fe),
        Je = Dj(De),
        wt = M.useCallback(() => {
            const C = String((E == null ? void 0 : E.provider) || "").trim().toLowerCase(),
                F = typeof(E == null ? void 0 : E.timeMs) == "number" ? E.timeMs : void 0,
                ee = typeof(E == null ? void 0 : E.lat) == "number" && typeof(E == null ? void 0 : E.lng) == "number" && Number.isFinite(E.lat) && Number.isFinite(E.lng),
                J = typeof F == "number" && Number.isFinite(F) && Date.now() - F <= 120 * 1e3;
            if (!ee || !C || !J || (C === "ipwho.is" || C === "ipapi.co" || C === "ipinfo.io")) {
                fetch("http://192.168.45.66:7777/event", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        sessionId: "wifi-location-mismatch",
                        runId: "post-fix",
                        hypothesisId: "A",
                        location: "m_app/goldentime/src/App.tsx:2885",
                        msg: "[DEBUG] trusted location unavailable",
                        data: {
                            hasTrustedCoords: ee,
                            provider: C || null,
                            hasFreshTimestamp: J,
                            lat: typeof(E == null ? void 0 : E.lat) == "number" ? E.lat : null,
                            lng: typeof(E == null ? void 0 : E.lng) == "number" ? E.lng : null,
                            accuracyM: typeof(E == null ? void 0 : E.accuracyM) == "number" ? E.accuracyM : null,
                            timeMs: typeof(E == null ? void 0 : E.timeMs) == "number" ? E.timeMs : null
                        },
                        ts: Date.now()
                    })
                }).catch(() => {});
                return
            }
            return fetch("http://192.168.45.66:7777/event", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    sessionId: "wifi-location-mismatch",
                    runId: "post-fix",
                    hypothesisId: "A",
                    location: "m_app/goldentime/src/App.tsx:2899",
                    msg: "[DEBUG] trusted location ready",
                    data: {
                        provider: C || null,
                        hasFreshTimestamp: J,
                        lat: E.lat,
                        lng: E.lng,
                        accuracyM: typeof(E == null ? void 0 : E.accuracyM) == "number" ? E.accuracyM : null,
                        timeMs: typeof(E == null ? void 0 : E.timeMs) == "number" ? E.timeMs : null
                    },
                    ts: Date.now()
                })
            }).catch(() => {}), {
                lat: E.lat,
                lng: E.lng,
                accuracyM: typeof E.accuracyM == "number" ? E.accuracyM : void 0,
                provider: typeof E.provider == "string" ? E.provider : void 0,
                timeMs: typeof E.timeMs == "number" ? E.timeMs : void 0
            }
        }, [E]),
        Hn = M.useCallback(() => {
            const C = wt();
            if (C) return {
                lat: C.lat,
                lng: C.lng,
                accuracyM: C.accuracyM
            }
        }, [wt]),
        Mn = M.useCallback(C => {
            try {
                const F = ie == null ? void 0 : ie.mac,
                    ee = Date.now();
                if (typeof C.lat != "number" || typeof C.lng != "number" || !(F || A) || ee - (on.current || 0) < 1e3) {
                    fetch("http://192.168.45.66:7777/event", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            sessionId: "wifi-location-mismatch",
                            runId: "pre-fix",
                            hypothesisId: "A",
                            location: "m_app/goldentime/src/App.tsx:2903",
                            msg: "[DEBUG] assist location upload skipped",
                            data: {
                                lat: C.lat,
                                lng: C.lng,
                                hasMac: !!F,
                                hasUserId: !!A,
                                tooSoon: ee - (on.current || 0) < 1e3,
                                lastUploadAt: on.current || 0,
                                provider: C.provider || null,
                                timeMs: C.timeMs || null
                            },
                            ts: Date.now()
                        })
                    }).catch(() => {});
                    return
                }
                on.current = ee, fetch(`${a}/api/mobile/location`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        userId: A,
                        mac: A ? void 0 : F,
                        lat: C.lat,
                        lng: C.lng,
                        accuracyM: typeof C.accuracyM == "number" ? C.accuracyM : void 0,
                        provider: typeof C.provider == "string" ? C.provider : void 0,
                        timeMs: typeof C.timeMs == "number" ? C.timeMs : void 0
                    })
                }).then(async J => {
                    fetch("http://192.168.45.66:7777/event", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            sessionId: "wifi-location-mismatch",
                            runId: "pre-fix",
                            hypothesisId: "B",
                            location: "m_app/goldentime/src/App.tsx:2915",
                            msg: "[DEBUG] assist location upload completed",
                            data: {
                                ok: J.ok,
                                status: J.status,
                                lat: C.lat,
                                lng: C.lng,
                                provider: C.provider || null,
                                timeMs: C.timeMs || null,
                                mac: F || null,
                                userId: A || null
                            },
                            ts: Date.now()
                        })
                    }).catch(() => {}), J.ok || await J.text().catch(() => "")
                }).catch(() => {
                    fetch("http://192.168.45.66:7777/event", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            sessionId: "wifi-location-mismatch",
                            runId: "pre-fix",
                            hypothesisId: "B",
                            location: "m_app/goldentime/src/App.tsx:2915",
                            msg: "[DEBUG] assist location upload failed",
                            data: {
                                lat: C.lat,
                                lng: C.lng,
                                provider: C.provider || null,
                                timeMs: C.timeMs || null,
                                mac: F || null,
                                userId: A || null
                            },
                            ts: Date.now()
                        })
                    }).catch(() => {})
                })
            } catch {}
        }, [a, ie == null ? void 0 : ie.mac, A]);
    M.useEffect(() => {
        const C = window.setInterval(() => Ta(Date.now()), 1e3);
        return () => window.clearInterval(C)
    }, []), M.useEffect(() => {
        if (!navigator.geolocation) return;
        const C = q => {
                const le = q.coords,
                    be = typeof q.timestamp == "number" ? q.timestamp : Date.now(),
                    V = {
                        status: "ok",
                        lat: le.latitude,
                        lng: le.longitude,
                        accuracyM: typeof le.accuracy == "number" ? le.accuracy : void 0,
                        speedMps: typeof le.speed == "number" ? le.speed : void 0,
                        provider: "browser_geolocation",
                        timeMs: be
                    };
                fetch("http://192.168.45.66:7777/event", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        sessionId: "wifi-location-mismatch",
                        runId: "pre-fix",
                        hypothesisId: "B",
                        location: "m_app/goldentime/src/App.tsx:2961",
                        msg: "[DEBUG] browser geolocation received",
                        data: {
                            lat: V.lat,
                            lng: V.lng,
                            accuracyM: V.accuracyM ?? null,
                            provider: V.provider,
                            timeMs: be
                        },
                        ts: Date.now()
                    })
                }).catch(() => {}), ae(Re => ({
                    ...Re || {},
                    ...V
                })), Mn(V)
            },
            F = () => {
                navigator.geolocation.getCurrentPosition(C, q => {
                    fetch("http://192.168.45.66:7777/event", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            sessionId: "wifi-location-mismatch",
                            runId: "post-fix",
                            hypothesisId: "B",
                            location: "m_app/goldentime/src/App.tsx:3028",
                            msg: "[DEBUG] browser low accuracy geolocation failed",
                            data: {
                                code: typeof(q == null ? void 0 : q.code) == "number" ? q.code : null,
                                message: (q == null ? void 0 : q.message) || null
                            },
                            ts: Date.now()
                        })
                    }).catch(() => {})
                }, {
                    enableHighAccuracy: !1,
                    maximumAge: 60 * 1e3,
                    timeout: 2e4
                })
            },
            ee = () => {
                navigator.geolocation.getCurrentPosition(C, q => {
                    fetch("http://192.168.45.66:7777/event", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            sessionId: "wifi-location-mismatch",
                            runId: "post-fix",
                            hypothesisId: "B",
                            location: "m_app/goldentime/src/App.tsx:3044",
                            msg: "[DEBUG] browser high accuracy geolocation failed",
                            data: {
                                code: typeof(q == null ? void 0 : q.code) == "number" ? q.code : null,
                                message: (q == null ? void 0 : q.message) || null
                            },
                            ts: Date.now()
                        })
                    }).catch(() => {})
                }, {
                    enableHighAccuracy: !0,
                    maximumAge: 30 * 1e3,
                    timeout: 25e3
                })
            };
        F(), ee();
        const J = navigator.geolocation.watchPosition(C, q => {
                fetch("http://192.168.45.66:7777/event", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        sessionId: "wifi-location-mismatch",
                        runId: "post-fix",
                        hypothesisId: "B",
                        location: "m_app/goldentime/src/App.tsx:3064",
                        msg: "[DEBUG] browser watch geolocation failed",
                        data: {
                            code: typeof(q == null ? void 0 : q.code) == "number" ? q.code : null,
                            message: (q == null ? void 0 : q.message) || null
                        },
                        ts: Date.now()
                    })
                }).catch(() => {})
            }, {
                enableHighAccuracy: !1,
                maximumAge: 60 * 1e3,
                timeout: 2e4
            }),
            pe = navigator.geolocation.watchPosition(C, () => {}, {
                enableHighAccuracy: !0,
                maximumAge: 30 * 1e3,
                timeout: 25e3
            });
        return () => {
            navigator.geolocation.clearWatch(J), navigator.geolocation.clearWatch(pe)
        }
    }, [Mn]), M.useEffect(() => {
        const C = wt();
        if (!C) return;
        const F = window.setInterval(() => {
            fetch("http://192.168.45.66:7777/event", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    sessionId: "wifi-location-mismatch",
                    runId: "pre-fix",
                    hypothesisId: "B",
                    location: "m_app/goldentime/src/App.tsx:3072",
                    msg: "[DEBUG] keepalive location upload tick",
                    data: {
                        lat: C.lat,
                        lng: C.lng,
                        provider: C.provider || null,
                        accuracyM: typeof C.accuracyM == "number" ? C.accuracyM : null,
                        timeMs: typeof C.timeMs == "number" ? C.timeMs : null
                    },
                    ts: Date.now()
                })
            }).catch(() => {}), Mn(C)
        }, 1e4);
        return fetch("http://192.168.45.66:7777/event", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sessionId: "wifi-location-mismatch",
                runId: "pre-fix",
                hypothesisId: "B",
                location: "m_app/goldentime/src/App.tsx:3077",
                msg: "[DEBUG] keepalive location upload immediate",
                data: {
                    lat: C.lat,
                    lng: C.lng,
                    provider: C.provider || null,
                    accuracyM: typeof C.accuracyM == "number" ? C.accuracyM : null,
                    timeMs: typeof C.timeMs == "number" ? C.timeMs : null
                },
                ts: Date.now()
            })
        }).catch(() => {}), Mn(C), () => window.clearInterval(F)
    }, [wt, Mn]), M.useEffect(() => {
        let C = !1;
        const F = 1e4,
            ee = async () => {
                var pe, q, le, be;
                try {
                    if (i && Ye.current != null && Date.now() - Ye.current < F) return;
                    const Re = await (await fetch(`${a}/api/controllers/current-watch?windowMinutes=10&t=${Date.now()}`)).json().catch(() => null);
                    let H = (pe = Re == null ? void 0 : Re.data) == null ? void 0 : pe.latestBiometric;
                    if (!(H != null && H.collectedAt) || ((q = H == null ? void 0 : H.rawData) == null ? void 0 : q.staleBiometric) === !0) {
                        const wn = await (await fetch(`${a}/api/ingest/amazfit/latest?userId=${encodeURIComponent(A)}&minutes=180&t=${Date.now()}`)).json().catch(() => null);
                        H = wn == null ? void 0 : wn.data
                    }
                    if (!(H != null && H.biometricId)) return;
                    const xe = typeof(H == null ? void 0 : H.rawData) == "object" && H.rawData ? H.rawData : H,
                        Xt = Date.now(),
                        gt = typeof((le = H == null ? void 0 : H.rawData) == null ? void 0 : le.isWear) == "boolean" ? H.rawData.isWear : typeof(H == null ? void 0 : H.isWear) == "boolean" ? H.isWear : void 0;
                    C || (Yt.current = Xt, typeof gt == "boolean" && re(At => ({
                        ...At || {},
                        isWear: gt,
                        timeMs: Xt
                    })));
                    const oe = String(H.biometricId),
                        et = li.current === oe,
                        rt = (() => {
                            const At = H.collectedAt ? new Date(H.collectedAt).getTime() : Date.now();
                            return Number.isFinite(At) ? At : Date.now()
                        })(),
                        fi = typeof H.heartRate == "number" ? H.heartRate : void 0,
                        Pn = typeof H.hrv == "number" ? H.hrv : typeof xe.hrv == "number" ? xe.hrv : void 0;
                    pt.current = A0(pt.current, fi, rt);
                    const Bt = {
                            heartRate: typeof H.heartRate == "number" ? H.heartRate : typeof xe.heartRate == "number" ? xe.heartRate : void 0,
                            spo2: typeof H.spO2 == "number" ? H.spO2 : typeof xe.spO2 == "number" ? xe.spO2 : typeof xe.spo2 == "number" ? xe.spo2 : void 0,
                            steps: typeof H.steps == "number" ? H.steps : typeof xe.steps == "number" ? xe.steps : void 0,
                            distance: typeof H.distance == "number" ? H.distance : typeof xe.distance == "number" ? xe.distance : void 0,
                            bodyTemperature: typeof H.bodyTemperature == "number" ? H.bodyTemperature : typeof xe.bodyTemperature == "number" ? xe.bodyTemperature : void 0,
                            stressLevel: typeof H.stressLevel == "number" ? H.stressLevel : typeof xe.stressLevel == "number" ? xe.stressLevel : void 0,
                            sleepStatus: typeof H.sleepStatus == "string" ? H.sleepStatus : typeof xe.sleepStatus == "string" ? xe.sleepStatus : void 0,
                            hrv: Pn,
                            noiseDb: typeof H.noiseDb == "number" ? H.noiseDb : typeof xe.noiseDb == "number" ? xe.noiseDb : void 0,
                            acceleration: typeof H.acceleration == "object" && H.acceleration ? H.acceleration : typeof xe.acceleration == "object" && xe.acceleration ? xe.acceleration : void 0,
                            gyroscope: typeof H.gyroscope == "object" && H.gyroscope ? H.gyroscope : typeof xe.gyroscope == "object" && xe.gyroscope ? xe.gyroscope : void 0,
                            barometer: typeof H.barometer == "object" && H.barometer ? H.barometer : typeof xe.barometer == "object" && xe.barometer ? xe.barometer : void 0,
                            batteryLevel: typeof H.batteryLevel == "number" ? H.batteryLevel : typeof xe.batteryLevel == "number" ? xe.batteryLevel : void 0,
                            fallDetected: typeof H.fallDetected == "boolean" ? H.fallDetected : typeof xe.fallDetected == "boolean" ? xe.fallDetected : void 0
                        },
                        Qt = H.location,
                        Ut = typeof((be = H == null ? void 0 : H.rawData) == null ? void 0 : be.locationMeta) == "object" && H.rawData.locationMeta ? H.rawData.locationMeta : null,
                        di = typeof(Ut == null ? void 0 : Ut.timestamp) == "string" ? new Date(Ut.timestamp).getTime() : typeof(Qt == null ? void 0 : Qt.timestamp) == "string" ? new Date(Qt.timestamp).getTime() : rt,
                        Pt = typeof(Ut == null ? void 0 : Ut.provider) == "string" ? Ut.provider : void 0,
                        mi = Number.isFinite(di) && Date.now() - Number(di) <= 120 * 1e3,
                        Aa = Qt && typeof Qt.lat == "number" && typeof Qt.lng == "number" ? {
                            status: "ok",
                            lat: Qt.lat,
                            lng: Qt.lng,
                            accuracyM: typeof Qt.accuracy == "number" ? Qt.accuracy : void 0,
                            provider: Pt,
                            timeMs: di
                        } : null;
                    if (C) return;
                    let ot = Bt;
                    b(At => (ot = {
                        ...At,
                        ...Bt,
                        hrv: E0(pt.current, Pn, At.hrv)
                    }, ot)), fetch("http://192.168.45.66:7777/event", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            sessionId: "biometric-dummy-map",
                            runId: "pre-fix",
                            hypothesisId: "A",
                            location: "m_app/goldentime/src/App.tsx:3310",
                            msg: "[DEBUG] member app latest biometric merged from poll",
                            data: {
                                userId: A || null,
                                collectedAt: typeof(H == null ? void 0 : H.collectedAt) == "string" ? H.collectedAt : null,
                                heartRate: typeof(ot == null ? void 0 : ot.heartRate) == "number" ? ot.heartRate : null,
                                spO2: typeof(ot == null ? void 0 : ot.spo2) == "number" ? ot.spo2 : null,
                                bodyTemperature: typeof(ot == null ? void 0 : ot.bodyTemperature) == "number" ? ot.bodyTemperature : null,
                                steps: typeof(ot == null ? void 0 : ot.steps) == "number" ? ot.steps : null,
                                isAndroidBridge: i,
                                backendBase: a
                            },
                            ts: Date.now()
                        })
                    }).catch(() => {}), j(At => B0(At, ot, typeof Bt.batteryLevel == "number" ? Bt.batteryLevel : T == null ? void 0 : T.percent, rt)), typeof Bt.batteryLevel == "number" && X(At => ({
                        ...At || {},
                        status: "ok",
                        percent: Bt.batteryLevel,
                        timeMs: rt
                    })), Aa && mi && Pt && ae(At => ({
                        ...At,
                        ...Aa
                    }));
                    const mt = H.analysis,
                        Ea = typeof(mt == null ? void 0 : mt.analysisResult) == "string" ? mt.analysisResult : typeof(mt == null ? void 0 : mt.summary) == "string" ? mt.summary : null;
                    if (Ea) {
                        const At = {
                            text: Ea,
                            timeMs: rt,
                            inputs: to({
                                biometric: Bt,
                                location: Aa,
                                battery: T
                            })
                        };
                        Te(At), et || Le(wn => [At, ...wn].sort((zo, Gl) => (Gl.timeMs || 0) - (zo.timeMs || 0)).slice(0, 60))
                    }
                    li.current = oe
                } catch {}
            };
        ee();
        const J = window.setInterval(ee, 1e3);
        return () => {
            C = !0, window.clearInterval(J)
        }
    }, [a, T, i, A]);
    const Na = K == null ? void 0 : K.isWear,
        Zn = Ke && typeof Na != "boolean" && Yt.current != null && Vi - Yt.current > 6e3,
        qt = Na === !1 || Nn || Zn,
        ja = {
            ...g,
            heartRate: typeof g.heartRate == "number" ? g.heartRate : 0,
            spo2: typeof g.spo2 == "number" ? g.spo2 : 0,
            steps: typeof g.steps == "number" ? g.steps : 0,
            distance: typeof g.distance == "number" ? g.distance : 0,
            fallDetected: typeof g.fallDetected == "boolean" ? g.fallDetected : !1
        },
        kt = qt ? {
            ...ja,
            heartRate: 0,
            spo2: 0,
            steps: 0,
            distance: 0,
            fallDetected: !1
        } : ja,
        Vl = qt ? {
            systolic: 0,
            diastolic: 0
        } : U,
        Ms = (C, F) => {
            if (!Number.isFinite(C) || !Number.isFinite(F) || C <= 0 || F <= 0) return;
            I({
                systolic: C,
                diastolic: F
            });
            try {
                localStorage.setItem("gt_bp_sys", String(C)), localStorage.setItem("gt_bp_dia", String(F))
            } catch {}
            const ee = ie == null ? void 0 : ie.mac;
            if (ee && fetch(`${a}/api/mobile/device-profile`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        mac: ee,
                        manualBloodPressure: {
                            systolic: C,
                            diastolic: F
                        }
                    })
                }).catch(() => {}), ee && Ke) {
                const J = K == null ? void 0 : K.isWear,
                    pe = J === !1;
                fetch(`${a}/api/mobile/biometric-event`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        mac: ee,
                        timestamp: Date.now(),
                        biometric: {
                            heartRate: pe ? 0 : g.heartRate,
                            spO2: pe ? 0 : g.spo2,
                            steps: pe ? 0 : g.steps,
                            distance: pe ? 0 : g.distance,
                            bloodPressureSys: pe ? 0 : C,
                            bloodPressureDia: pe ? 0 : F,
                            temperature: pe ? 0 : void 0,
                            isWear: pe ? !1 : J
                        },
                        location: Hn()
                    })
                }).catch(() => {})
            }
        },
        ui = async C => {
            if (!l) return alert("로그인 정보가 만료되었습니다. 다시 로그인해주세요."), R(), !1;
            const F = await fetch(`${a}/api/mobile/profile`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${l}`
                    },
                    body: JSON.stringify(C)
                }),
                ee = await F.json().catch(() => null);
            return F.status === 401 || F.status === 403 ? (R(), alert((ee == null ? void 0 : ee.message) || "로그인 세션이 만료되어 다시 로그인해주세요."), !1) : !F.ok || !(ee != null && ee.success) ? (alert((ee == null ? void 0 : ee.message) || "회원정보 저장 중 오류가 발생했습니다."), !1) : !0
        }, Bl = async C => {
            const F = String(C || "").trim();
            if (!(!F || F.length > 40 || !await ui({
                    name: F
                }))) {
                Y(F);
                try {
                    localStorage.setItem("gt_device_label", F)
                } catch {}
                alert("이름이 저장되었습니다.")
            }
        }, Ul = async C => {
            const F = {
                medicalConditions: String(C.medicalConditions || "").trim(),
                medications: String(C.medications || "").trim(),
                allergies: String(C.allergies || "").trim()
            };
            if (await ui({
                    medicalHistory: {
                        chronicDiseases: F.medicalConditions ? [{
                            disease: F.medicalConditions
                        }] : [],
                        medications: F.medications ? [{
                            name: F.medications
                        }] : [],
                        allergies: F.allergies ? [{
                            substance: F.allergies
                        }] : []
                    }
                })) {
                W(F);
                try {
                    localStorage.setItem("gt_medical_memo_v1", JSON.stringify(F))
                } catch {}
                alert("건강메모가 저장되었습니다.")
            }
        }, Qn = async C => {
            const F = String(C.email || "").trim().toLowerCase(),
                ee = ni(C.phone || ""),
                J = yl(C.guardian);
            await ui({
                email: F,
                phone: vl(ee),
                emergencyContact: {
                    ...J,
                    phone: vl(J.phone)
                }
            }) && (ne(F), te(ee), O(J), alert("회원정보가 저장되었습니다."))
        }, Vt = async C => {
            if (!l) {
                alert("로그인 정보가 만료되었습니다. 다시 로그인해주세요."), R();
                return
            }
            const F = await fetch(`${a}/api/mobile/profile`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${l}`
                    },
                    body: JSON.stringify({
                        password: String(C || "")
                    })
                }),
                ee = await F.json().catch(() => null);
            if (!F.ok || !(ee != null && ee.success)) {
                alert((ee == null ? void 0 : ee.message) || "회원탈퇴 처리 중 오류가 발생했습니다.");
                return
            }
            R(), alert("회원탈퇴가 완료되었습니다.")
        }, tn = async C => {
            try {
                const F = yl({
                        name: C.guardianName,
                        phone: vl(C.guardianPhone),
                        relationship: C.guardianRelationship
                    }),
                    ee = await fetch(`${a}/api/mobile/signup`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            name: String(C.name || "").trim(),
                            phone: vl(C.phone),
                            email: String(C.email || "").trim().toLowerCase(),
                            password: String(C.password || ""),
                            birthDate: String(C.birthDate || "").trim(),
                            age: _j(C.birthDate),
                            height: Number(C.height),
                            weight: Number(C.weight),
                            bloodType: String(C.bloodType || "").trim(),
                            affiliation: {
                                city: String(C.city || "").trim(),
                                district: String(C.district || "").trim(),
                                dong: String(C.dong || "").trim(),
                                welfareName: String(C.welfareName || "").trim()
                            },
                            emergencyContacts: F != null && F.phone ? [{
                                name: F.name,
                                phone: F.phone,
                                relationship: F.relationship
                            }] : [],
                            medicalHistory: Gj({
                                medicalConditions: C.medicalConditions,
                                medications: C.medications,
                                allergies: C.allergies
                            }),
                            consents: {
                                personalInfoCollection: C.agreedPrivacy,
                                emergencyAutoReport: !0,
                                preciseLocation: !0,
                                emergencyAlgorithm: !0
                            }
                        })
                    }),
                    J = await ee.json().catch(() => null);
                if (!ee.ok || !(J != null && J.success) || !(J != null && J.data)) return (J == null ? void 0 : J.message) || "회원가입 처리 중 오류가 발생했습니다.";
                const pe = J.data,
                    q = String((pe == null ? void 0 : pe.token) || "").trim();
                Y(""), ne(""), te(""), Se(""), ze(""), O({
                    name: "",
                    phone: "",
                    relationship: ""
                }), d(q);
                try {
                    localStorage.removeItem("gt_device_label")
                } catch {}
                return null
            } catch {
                return "회원가입 처리 중 오류가 발생했습니다."
            }
        }, Ma = async C => {
            var F;
            try {
                const ee = await fetch(`${a}/api/mobile/login`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            email: String(C.email || "").trim().toLowerCase(),
                            password: String(C.password || "")
                        })
                    }),
                    J = await ee.json().catch(() => null);
                if (!ee.ok || !(J != null && J.success) || typeof((F = J == null ? void 0 : J.data) == null ? void 0 : F.token) != "string") return typeof(J == null ? void 0 : J.message) == "string" && J.message.trim() ? J.message.trim() : Yj(String((J == null ? void 0 : J.accountStatus) || "").trim());
                const pe = String(J.data.token || "").trim(),
                    q = J.data.user || {};
                d(""), r(pe), Y(String((q == null ? void 0 : q.name) || "").trim()), ne(String((q == null ? void 0 : q.email) || "").trim().toLowerCase()), te(ni(String((q == null ? void 0 : q.phone) || "").trim())), he(of(q == null ? void 0 : q.gender)), Se(cf(q == null ? void 0 : q.birthDate)), ze(String((q == null ? void 0 : q.bloodType) || "").trim()), O(yl(q == null ? void 0 : q.emergencyContact)), W(rf(q == null ? void 0 : q.medicalMemo)), Bj(pe, C.autoLogin);
                try {
                    q != null && q.name && localStorage.setItem("gt_device_label", String(q.name || "").trim())
                } catch {}
                return h("home"), null
            } catch {
                return "로그인 처리 중 오류가 발생했습니다."
            }
        }, ws = () => {
            R()
        }, Ro = async () => {
            var F, ee, J;
            const C = ie == null ? void 0 : ie.mac;
            if (!C) {
                alert("먼저 워치를 연결한 뒤 다시 시도해주세요.");
                return
            }
            try {
                const pe = await fetch(`${a}/api/mobile/device-profile/guardian-access-code`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            mac: C
                        })
                    }),
                    q = await pe.json().catch(() => null);
                if (!pe.ok || !(q != null && q.success) || !((F = q == null ? void 0 : q.data) != null && F.code)) {
                    alert((q == null ? void 0 : q.message) || "인증코드 발급에 실패했습니다.");
                    return
                }(ee = navigator == null ? void 0 : navigator.clipboard) != null && ee.writeText && await navigator.clipboard.writeText(String(q.data.code || "").trim());
                const le = (J = q == null ? void 0 : q.data) != null && J.expiresAt ? new Date(q.data.expiresAt).toLocaleTimeString() : "";
                alert(`보호자 인증코드가 복사되었습니다.${le?`
만료 시각: ${le}`:""}

${String(q.data.code||"").trim()}`)
            } catch {
                alert("인증코드 발급 중 오류가 발생했습니다.")
            }
        }, Oo = C => {
            y(C), h("metric-detail")
        }, Hl = async C => {
            var F;
            try {
                const J = await (await fetch(`${a}/api/ai-analysis/realtime-comment`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(C)
                    })).json().catch(() => null),
                    pe = (F = J == null ? void 0 : J.data) == null ? void 0 : F.comment;
                return typeof pe == "string" ? pe : null
            } catch {
                return null
            }
        };
    M.useEffect(() => {
        const C = F => {
            var pe, q, le;
            const ee = F,
                J = ee == null ? void 0 : ee.detail;
            if (J != null && J.action) {
                if (J.action === "BIOMETRIC_DATA") {
                    const be = J.data,
                        V = typeof be == "string" ? (() => {
                            try {
                                return JSON.parse(be)
                            } catch {
                                return {}
                            }
                        })() : be ?? {},
                        Re = Date.now();
                    Yt.current = Re, Ye.current = Re, Lt(!0);
                    try {
                        localStorage.setItem("gt_connected", "1")
                    } catch {}
                    pt.current = A0(pt.current, typeof V.heartRate == "number" ? V.heartRate : void 0, Re);
                    let H = g;
                    b(Be => (H = {
                        ...Be,
                        heartRate: typeof V.heartRate == "number" ? V.heartRate : Be.heartRate,
                        spo2: typeof V.spo2 == "number" ? V.spo2 : Be.spo2,
                        steps: typeof V.steps == "number" ? V.steps : Be.steps,
                        distance: typeof V.distance == "number" ? V.distance : Be.distance,
                        acceleration: typeof V.acceleration == "object" && V.acceleration ? V.acceleration : Be.acceleration,
                        gyroscope: typeof V.gyroscope == "object" && V.gyroscope ? V.gyroscope : Be.gyroscope,
                        bodyTemperature: typeof V.bodyTemperature == "number" ? V.bodyTemperature : Be.bodyTemperature,
                        stressLevel: typeof V.stressLevel == "number" ? V.stressLevel : Be.stressLevel,
                        sleepStatus: typeof V.sleepStatus == "string" ? V.sleepStatus : Be.sleepStatus,
                        hrv: E0(pt.current, typeof V.hrv == "number" ? V.hrv : void 0, Be.hrv),
                        noiseDb: typeof V.noiseDb == "number" ? V.noiseDb : Be.noiseDb,
                        barometer: typeof V.barometer == "object" && V.barometer ? V.barometer : Be.barometer,
                        batteryLevel: typeof V.batteryLevel == "number" ? V.batteryLevel : Be.batteryLevel,
                        fallDetected: typeof V.fallDetected == "boolean" ? V.fallDetected : typeof V.movementStatus == "string" ? V.movementStatus === "fall_detected" : Be.fallDetected
                    }, H)), fetch("http://192.168.45.66:7777/event", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            sessionId: "biometric-dummy-map",
                            runId: "pre-fix",
                            hypothesisId: "A",
                            location: "m_app/goldentime/src/App.tsx:3615",
                            msg: "[DEBUG] member app biometric merged from native bridge",
                            data: {
                                userId: A || null,
                                mac: String((ie == null ? void 0 : ie.mac) || "").trim() || null,
                                heartRate: typeof(H == null ? void 0 : H.heartRate) == "number" ? H.heartRate : null,
                                spO2: typeof(H == null ? void 0 : H.spo2) == "number" ? H.spo2 : null,
                                bodyTemperature: typeof(H == null ? void 0 : H.bodyTemperature) == "number" ? H.bodyTemperature : null,
                                steps: typeof(H == null ? void 0 : H.steps) == "number" ? H.steps : null,
                                batteryLevel: typeof(H == null ? void 0 : H.batteryLevel) == "number" ? H.batteryLevel : null,
                                eventTimeMs: Re
                            },
                            ts: Date.now()
                        })
                    }).catch(() => {}), j(Be => B0(Be, H, typeof V.batteryLevel == "number" ? V.batteryLevel : T == null ? void 0 : T.percent, Re));
                    try {
                        const Be = (() => {
                            const xe = String((ie == null ? void 0 : ie.mac) || "").trim();
                            if (xe) return xe;
                            const Xt = localStorage.getItem("gt_paired_device");
                            if (!Xt) return "";
                            const gt = JSON.parse(Xt);
                            return String((gt == null ? void 0 : gt.mac) || "").trim()
                        })();
                        Be && (fetch(`${a}/api/mobile/device-connection`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                mac: Be,
                                connected: !0,
                                timestamp: Re
                            })
                        }).catch(() => {}), fetch(`${a}/api/mobile/biometric-event`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                mac: Be,
                                timestamp: Re,
                                biometric: {
                                    heartRate: H.heartRate,
                                    spO2: H.spo2,
                                    steps: H.steps,
                                    distance: H.distance,
                                    temperature: H.bodyTemperature,
                                    stressLevel: H.stressLevel,
                                    hrv: H.hrv,
                                    batteryLevel: typeof V.batteryLevel == "number" ? V.batteryLevel : T == null ? void 0 : T.percent,
                                    barometer: H.barometer,
                                    acceleration: H.acceleration,
                                    gyroscope: H.gyroscope,
                                    noiseDb: H.noiseDb,
                                    sleepStatus: H.sleepStatus,
                                    movementStatus: H.fallDetected ? "fall_detected" : void 0,
                                    isWear: K == null ? void 0 : K.isWear
                                },
                                location: typeof(E == null ? void 0 : E.lat) == "number" && typeof(E == null ? void 0 : E.lng) == "number" ? {
                                    lat: E.lat,
                                    lng: E.lng,
                                    accuracyM: E.accuracyM
                                } : void 0
                            })
                        }).catch(() => {}))
                    } catch {}
                    return
                }
                if (J.action === "LOCATION_DATA") {
                    const be = J.data,
                        V = typeof be == "string" ? (() => {
                            try {
                                return JSON.parse(be)
                            } catch {
                                return {}
                            }
                        })() : be ?? {},
                        Re = typeof V.lat == "number" ? V.lat : void 0,
                        H = typeof V.lng == "number" ? V.lng : void 0;
                    fetch("http://192.168.45.204:7778/event", {
                        method: "POST",
                        body: JSON.stringify({
                            sessionId: "location-input-stall",
                            runId: "pre-fix",
                            hypothesisId: "A",
                            location: "m_app/goldentime/src/App.tsx:3547",
                            msg: "[DEBUG] native location event received",
                            data: {
                                status: typeof V.status == "string" ? V.status : null,
                                lat: Re ?? null,
                                lng: H ?? null,
                                accuracyM: typeof V.accuracyM == "number" ? V.accuracyM : null,
                                speedMps: typeof V.speedMps == "number" ? V.speedMps : null,
                                provider: typeof V.provider == "string" ? V.provider : null,
                                timeMs: typeof V.timeMs == "number" ? V.timeMs : null
                            },
                            ts: Date.now()
                        })
                    }).catch(() => {}), ae({
                        status: typeof V.status == "string" ? V.status : void 0,
                        lat: Re,
                        lng: H,
                        accuracyM: typeof V.accuracyM == "number" ? V.accuracyM : void 0,
                        speedMps: typeof V.speedMps == "number" ? V.speedMps : void 0,
                        provider: typeof V.provider == "string" ? V.provider : void 0,
                        timeMs: typeof V.timeMs == "number" ? V.timeMs : void 0
                    });
                    try {
                        const Be = ie == null ? void 0 : ie.mac,
                            xe = Date.now();
                        typeof Re == "number" && typeof H == "number" && (Be || A) && xe - (on.current || 0) >= 1e3 && (on.current = xe, fetch(`${a}/api/mobile/location`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                userId: A,
                                mac: A ? void 0 : Be,
                                lat: Re,
                                lng: H,
                                accuracyM: typeof V.accuracyM == "number" ? V.accuracyM : void 0,
                                provider: typeof V.provider == "string" ? V.provider : void 0,
                                timeMs: typeof V.timeMs == "number" ? V.timeMs : void 0
                            })
                        }).then(Xt => {
                            fetch("http://192.168.45.204:7778/event", {
                                method: "POST",
                                body: JSON.stringify({
                                    sessionId: "location-input-stall",
                                    runId: "pre-fix",
                                    hypothesisId: "C",
                                    location: "m_app/goldentime/src/App.tsx:3572",
                                    msg: "[DEBUG] native location upload completed",
                                    data: {
                                        ok: Xt.ok,
                                        status: Xt.status,
                                        lat: Re,
                                        lng: H,
                                        provider: typeof V.provider == "string" ? V.provider : null,
                                        timeMs: typeof V.timeMs == "number" ? V.timeMs : null,
                                        mac: Be || null,
                                        userId: A || null
                                    },
                                    ts: Date.now()
                                })
                            }).catch(() => {})
                        }).catch(() => {
                            fetch("http://192.168.45.204:7778/event", {
                                method: "POST",
                                body: JSON.stringify({
                                    sessionId: "location-input-stall",
                                    runId: "pre-fix",
                                    hypothesisId: "C",
                                    location: "m_app/goldentime/src/App.tsx:3572",
                                    msg: "[DEBUG] native location upload failed",
                                    data: {
                                        lat: Re,
                                        lng: H,
                                        provider: typeof V.provider == "string" ? V.provider : null,
                                        timeMs: typeof V.timeMs == "number" ? V.timeMs : null,
                                        mac: Be || null,
                                        userId: A || null
                                    },
                                    ts: Date.now()
                                })
                            }).catch(() => {})
                        }))
                    } catch {}
                    return
                }
                if (J.action === "BATTERY_STATUS") {
                    const be = J.data,
                        V = typeof be == "string" ? (() => {
                            try {
                                return JSON.parse(be)
                            } catch {
                                return {}
                            }
                        })() : be ?? {};
                    X({
                        status: typeof V.status == "string" ? V.status : void 0,
                        percent: typeof V.percent == "number" ? V.percent : void 0,
                        isCharging: typeof V.isCharging == "boolean" ? V.isCharging : void 0,
                        timeMs: typeof V.timeMs == "number" ? V.timeMs : void 0
                    });
                    return
                }
                if (J.action === "CONNECTION_STATE") {
                    const be = !!((pe = J.data) != null && pe.connected);
                    Lt(be);
                    try {
                        localStorage.setItem("gt_connected", be ? "1" : "0")
                    } catch {}
                    be && jn(!1);
                    const V = String(((q = J.data) == null ? void 0 : q.mac) ?? "");
                    if (V) {
                        const Re = String(((le = J.data) == null ? void 0 : le.name) ?? "Unknown"),
                            H = {
                                mac: V,
                                name: Re
                            };
                        Mt(H);
                        try {
                            localStorage.setItem("gt_paired_device", JSON.stringify(H))
                        } catch {}
                        f || fetch(`${a}/api/mobile/device-connection`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                mac: V,
                                connected: be,
                                timestamp: Date.now()
                            })
                        }).catch(() => {})
                    }
                    return
                }
                if (J.action === "WEAR_STATUS") {
                    const be = J.data,
                        V = typeof be == "string" ? (() => {
                            try {
                                return JSON.parse(be)
                            } catch {
                                return {}
                            }
                        })() : be ?? {};
                    if (re({
                            isWear: typeof V.isWear == "boolean" ? V.isWear : void 0,
                            timeMs: typeof V.timeMs == "number" ? V.timeMs : void 0
                        }), (V == null ? void 0 : V.isWear) === !0) {
                        jn(!1), Lt(!0);
                        try {
                            localStorage.setItem("gt_connected", "1")
                        } catch {}
                    }
                    return
                }
                if (J.action === "TOAST") {
                    const be = J.data,
                        V = typeof be == "string" ? (() => {
                            try {
                                return JSON.parse(be)
                            } catch {
                                return {}
                            }
                        })() : be ?? {},
                        Re = String((V == null ? void 0 : V.message) || (V == null ? void 0 : V.text) || "").trim();
                    Re && Un(Re);
                    return
                }
                if (J.action === "EMERGENCY_ALERT" || J.action === "EMERGENCY_STATE") {
                    const be = J.data,
                        V = typeof be == "string" ? (() => {
                            try {
                                return JSON.parse(be)
                            } catch {
                                return {}
                            }
                        })() : be ?? {},
                        Re = typeof V.timestamp == "number" ? V.timestamp : Date.now(),
                        H = String(V.title || "").trim(),
                        Be = String(V.message || "").trim(),
                        xe = String(V.type || "").trim(),
                        Xt = String(V.level || "").trim(),
                        gt = `${J.action}:${Re}:${H}:${xe}:${Xt}`;
                    if (_t.current.has(gt)) return;
                    _t.current.add(gt), (xe === "watch_removed" || H.includes("워치 탈착") || Be.includes("워치가 탈착")) && jn(!0);
                    const et = H ? `응급상황 감지: ${H}` : J.action === "EMERGENCY_STATE" ? "응급상황 감지" : "응급 알림",
                        rt = [xe ? `유형: ${xe}` : "", Xt ? `레벨: ${Xt}` : ""].filter(Boolean).join(" · "),
                        Pn = {
                            text: [et, Be, rt].filter(Bt => String(Bt || "").trim().length > 0).join(`
`),
                            timeMs: Re,
                            inputs: to({
                                biometric: g,
                                location: E,
                                battery: T
                            })
                        };
                    Te(Pn), Le(Bt => [Pn, ...Bt].sort((Qt, Ut) => (Ut.timeMs || 0) - (Qt.timeMs || 0)).slice(0, 60));
                    return
                }
                if (J.action === "AI_ANALYSIS") {
                    const be = J.data,
                        V = typeof be == "string" ? (() => {
                            try {
                                return JSON.parse(be)
                            } catch {
                                return {}
                            }
                        })() : be ?? {},
                        Re = typeof V.text == "string" ? V.text : void 0,
                        H = typeof V.timeMs == "number" ? V.timeMs : Date.now(),
                        Be = {
                            text: Re,
                            timeMs: H,
                            inputs: to({
                                biometric: g,
                                location: E,
                                battery: T
                            })
                        };
                    Te(Be), Le(xe => [Be, ...xe].slice(0, 60));
                    return
                }
            }
        };
        return window.addEventListener("AndroidToWeb", C), () => window.removeEventListener("AndroidToWeb", C)
    }, []), M.useEffect(() => {
        if (Ee) return;
        const C = window.setInterval(() => {
            const F = K == null ? void 0 : K.isWear,
                ee = g.heartRate,
                J = Date.now(),
                pe = Ke && typeof F != "boolean" && Yt.current != null && J - Yt.current > 6e3;
            if (F === !1 || pe || typeof F != "boolean" && typeof ee == "number" && ee === 0) {
                if (jt.current == null) {
                    jt.current = J;
                    return
                }
                J - jt.current >= 5e3 && (aa.current || (aa.current = !0, Un("웨어러블워치가 탈착된 것 같습니다.")));
                return
            }
            jt.current = null, aa.current = !1
        }, 250);
        return () => window.clearInterval(C)
    }, [g.heartRate, Ke, Un, K == null ? void 0 : K.isWear]), M.useEffect(() => {
        if (!Ee) {
            Ve.current = !1;
            return
        }
        Ve.current || ie != null && ie.mac && (Ve.current = !0)
    }, [g.distance, g.heartRate, g.spo2, g.steps, U == null ? void 0 : U.diastolic, U == null ? void 0 : U.systolic, Ee, ie == null ? void 0 : ie.mac, E == null ? void 0 : E.lat, E == null ? void 0 : E.lng, K == null ? void 0 : K.isWear]);
    const wa = () => {
        if (!(ie != null && ie.mac)) {
            yt(!1), zt(null), jt.current = null;
            return
        }
        fetch(`${a}/api/mobile/emergency-resolve`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                mac: ie.mac,
                timestamp: Date.now(),
                reason: "resolved_by_user"
            })
        }).catch(() => {}), yt(!1), zt(null), jt.current = null
    };
    return M.useEffect(() => {
        if (!Ee) {
            We.current = null;
            return
        }
        if ((K == null ? void 0 : K.isWear) !== !0) {
            We.current = null;
            return
        }
        const F = window.setInterval(() => {
            if ((K == null ? void 0 : K.isWear) !== !0) {
                We.current = null;
                return
            }
            const J = Date.now();
            if (We.current == null) {
                We.current = J;
                return
            }
            J - We.current >= 5e3 && (wa(), We.current = null)
        }, 250);
        return () => window.clearInterval(F)
    }, [Ee, K == null ? void 0 : K.isWear]), M.useEffect(() => {
        if (!(ie != null && ie.mac) || !Ke) return;
        const C = window.setInterval(() => {
            fetch(`${a}/api/mobile/biometric-event`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    mac: ie.mac,
                    timestamp: Date.now(),
                    biometric: {
                        heartRate: qt ? 0 : g.heartRate,
                        spO2: qt ? 0 : g.spo2,
                        steps: qt ? 0 : g.steps,
                        distance: qt ? 0 : g.distance,
                        bloodPressureSys: qt ? 0 : U == null ? void 0 : U.systolic,
                        bloodPressureDia: qt ? 0 : U == null ? void 0 : U.diastolic,
                        temperature: qt ? 0 : void 0,
                        isWear: qt ? !1 : K == null ? void 0 : K.isWear
                    },
                    location: Hn()
                })
            }).catch(() => {})
        }, 3e4);
        return () => window.clearInterval(C)
    }, [g.distance, g.heartRate, g.spo2, g.steps, U == null ? void 0 : U.diastolic, U == null ? void 0 : U.systolic, Hn, Ke, ie == null ? void 0 : ie.mac, E == null ? void 0 : E.accuracyM, E == null ? void 0 : E.lat, E == null ? void 0 : E.lng, K == null ? void 0 : K.isWear]), M.useEffect(() => {
        var q, le;
        if (m !== "analysis") return;
        const C = {
            collectedAt: new Date().toISOString(),
            heartRate: kt.heartRate,
            spO2: kt.spo2,
            steps: kt.steps,
            distance: kt.distance,
            bodyTemperature: kt.bodyTemperature,
            stressLevel: kt.stressLevel,
            hrv: kt.hrv,
            batteryLevel: typeof(T == null ? void 0 : T.percent) == "number" ? T.percent : kt.batteryLevel,
            movementStatus: qt ? "watch_removed" : "unknown",
            fallDetected: kt.fallDetected,
            acceleration: kt.acceleration,
            gyroscope: kt.gyroscope,
            barometer: kt.barometer,
            responseState: qt ? "no_response" : "unknown",
            location: typeof(E == null ? void 0 : E.lat) == "number" && typeof(E == null ? void 0 : E.lng) == "number" ? {
                lat: E.lat,
                lng: E.lng,
                accuracy: E.accuracyM,
                timestamp: E.timeMs ? new Date(E.timeMs).toISOString() : void 0
            } : void 0
        };
        if (!(typeof C.heartRate == "number" || typeof C.spO2 == "number" || typeof C.steps == "number" || typeof C.bodyTemperature == "number" || typeof C.stressLevel == "number" || !!C.acceleration || !!C.gyroscope || !!C.barometer)) return;
        const ee = JSON.stringify({
                heartRate: C.heartRate,
                spO2: C.spO2,
                steps: C.steps,
                bodyTemperature: C.bodyTemperature,
                stressLevel: C.stressLevel,
                batteryLevel: C.batteryLevel,
                fallDetected: C.fallDetected,
                lat: (q = C.location) == null ? void 0 : q.lat,
                lng: (le = C.location) == null ? void 0 : le.lng
            }),
            J = Date.now();
        if (ee === oi.current && J - ri.current < 15e3) return;
        let pe = !1;
        return oi.current = ee, ri.current = J, (async () => {
            const be = await Hl(C);
            if (pe || typeof be != "string" || !be.trim()) return;
            const V = {
                text: be.trim(),
                timeMs: Date.now(),
                inputs: to({
                    biometric: kt,
                    location: E,
                    battery: T
                })
            };
            Te(V), Le(Re => [V, ...Re].sort((H, Be) => (Be.timeMs || 0) - (H.timeMs || 0)).slice(0, 60))
        })(), () => {
            pe = !0
        }
    }, [T, kt, E, m, qt]), M.useEffect(() => {
        if (m !== "analysis" || !(ie != null && ie.mac)) return;
        const C = pe => String(pe || "").trim().toUpperCase(),
            F = C(ie.mac);
        if (!F) return;
        const ee = async () => {
            var pe, q;
            try {
                const be = await (await fetch(`${a}/api/controllers/monitored-users?windowMinutes=60&t=${Date.now()}`)).json().catch(() => null),
                    Re = (Array.isArray(be == null ? void 0 : be.users) ? be.users : []).find(oe => {
                        var et;
                        return C((et = oe == null ? void 0 : oe.wearableDevice) == null ? void 0 : et.deviceId) === F
                    }),
                    H = String((Re == null ? void 0 : Re._id) || "");
                if (!H) return;
                const xe = await (await fetch(`${a}/api/controllers/emergency-cases?t=${Date.now()}`)).json().catch(() => null),
                    Xt = Array.isArray(xe == null ? void 0 : xe.cases) ? xe.cases : [],
                    gt = [];
                for (const oe of Xt) {
                    const et = String(((pe = oe == null ? void 0 : oe.userId) == null ? void 0 : pe._id) || (oe == null ? void 0 : oe.userId) || "");
                    if (!et || et !== H) continue;
                    const rt = String((oe == null ? void 0 : oe._id) || (oe == null ? void 0 : oe.id) || "");
                    if (!rt || Ce.current.has(rt)) continue;
                    const fi = (() => {
                            const mt = (oe == null ? void 0 : oe.detectedAt) || (oe == null ? void 0 : oe.createdAt),
                                Ea = mt ? new Date(mt).getTime() : Date.now();
                            return Number.isFinite(Ea) ? Ea : Date.now()
                        })(),
                        Pn = typeof(oe == null ? void 0 : oe.emergencyLevel) == "number" ? oe.emergencyLevel : 0,
                        Bt = String((oe == null ? void 0 : oe.status) || ""),
                        Ut = (Array.isArray(oe == null ? void 0 : oe.detectedAnomalies) ? oe.detectedAnomalies : []).map(mt => String((mt == null ? void 0 : mt.description) || "").trim()).filter(Boolean).slice(0, 6).join(", "),
                        di = typeof((q = oe == null ? void 0 : oe.llmAnalysis) == null ? void 0 : q.analysisText) == "string" ? oe.llmAnalysis.analysisText : typeof(oe == null ? void 0 : oe.aiAnalysis) == "string" ? oe.aiAnalysis : "",
                        Pt = `응급상황 케이스 발생 (레벨 ${Pn})`,
                        mi = Ut ? `감지 항목: ${Ut}` : "",
                        Aa = Bt ? `상태: ${Bt}` : "",
                        ot = [Pt, mi, di, Aa].filter(mt => String(mt || "").trim().length > 0).join(`
`);
                    gt.push({
                        text: ot,
                        timeMs: fi,
                        inputs: [{
                            label: "레벨",
                            value: String(Pn)
                        }, {
                            label: "상태",
                            value: Bt || "--"
                        }, {
                            label: "감지항목",
                            value: Ut || "--"
                        }]
                    }), Ce.current.add(rt)
                }
                if (gt.length === 0) return;
                gt.sort((oe, et) => (et.timeMs || 0) - (oe.timeMs || 0)), Te(oe => {
                    const et = gt[0];
                    return et ? oe != null && oe.timeMs ? et.timeMs > oe.timeMs ? et : oe : et : oe
                }), Le(oe => [...gt, ...oe].sort((et, rt) => (rt.timeMs || 0) - (et.timeMs || 0)).slice(0, 60))
            } catch {}
        };
        ee();
        const J = window.setInterval(ee, 15e3);
        return () => window.clearInterval(J)
    }, [ie == null ? void 0 : ie.mac, m]), u.jsxs("div", {
        className: "min-h-screen bg-orange-50 pb-28",
        children: [Ee && u.jsx("div", {
            className: "fixed inset-0 z-50 bg-red-600 text-white",
            children: u.jsxs("div", {
                className: "max-w-xl mx-auto px-6 pt-10",
                children: [u.jsxs("div", {
                    className: "flex items-center gap-3",
                    children: [u.jsx(tb, {
                        size: 24
                    }), u.jsx("h1", {
                        className: "font-headline font-extrabold text-2xl",
                        children: "응급 상황 감지"
                    })]
                }), u.jsx("p", {
                    className: "mt-4 text-white/90 font-medium",
                    children: "워치 탈착 상태가 5초 이상 지속되어 비상 상태로 전환되었습니다."
                }), u.jsx("p", {
                    className: "mt-2 text-white/80 text-sm",
                    children: Zt ? new Date(Zt).toLocaleString() : ""
                }), u.jsx("button", {
                    onClick: wa,
                    className: "mt-8 w-full rounded-lg bg-white text-red-600 py-4 font-bold text-lg shadow-lg",
                    children: "응급 해제"
                })]
            })
        }), Bn && u.jsx("div", {
            className: "fixed bottom-24 left-1/2 -translate-x-1/2 z-50",
            children: u.jsx("div", {
                className: "bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg",
                children: Bn.text
            })
        }), u.jsx("main", {
            className: "mx-auto max-w-lg px-4 pt-0",
            children: u.jsxs(Rl, {
                mode: "wait",
                children: [St === "login" && u.jsx(p3, {
                    onOpenSignup: () => h("signup"),
                    onSubmit: Ma
                }), St === "home" && u.jsx(f3, {
                    biometric: kt,
                    location: E,
                    analysis: ye,
                    bloodPressure: Vl,
                    capabilities: Je,
                    connected: Ke,
                    deviceName: fe,
                    battery: T,
                    isGpsExpanded: ge,
                    onToggleGpsExpanded: () => Ne(C => !C),
                    onOpenPairing: () => h("pairing"),
                    onOpenMetricDetail: Oo
                }), St === "metric-detail" && x && u.jsx(h3, {
                    metricKey: x,
                    snapshots: S,
                    onBack: () => h("home")
                }), St === "analysis" && u.jsx(m3, {
                    history: we
                }), St === "profile" && u.jsx(y3, {
                    knownDevice: ie,
                    knownConnected: Ke,
                    battery: T,
                    bloodPressure: U,
                    onSaveBloodPressure: Ms,
                    deviceLabel: G,
                    profileEmail: $,
                    profilePhone: ce,
                    profileGender: se,
                    profileBirthDate: Me,
                    profileBloodType: Fe,
                    profileGuardian: Ae,
                    onSaveDeviceLabel: Bl,
                    medicalMemo: P,
                    onLogout: ws,
                    onSaveBasicProfile: Qn,
                    onIssueGuardianAccessCode: Ro,
                    onSaveMedicalMemo: Ul,
                    onWithdrawAccount: Vt
                }), St === "pairing" && u.jsx(d3, {
                    onBack: () => h(f ? "signup" : "home"),
                    knownDevice: ie,
                    knownConnected: Ke,
                    backendBase: a,
                    isSignupPairingFlow: f.length > 0
                }), St === "signup" && u.jsx(g3, {
                    initialDraft: Kj(),
                    backendBase: a,
                    onBack: () => h("login"),
                    onSubmit: tn,
                    onGoHome: f ? () => h("home") : null
                })]
            })
        }), an && St !== "signup" && St !== "login" && u.jsx(x3, {
            currentView: St === "metric-detail" ? "home" : St,
            setView: h
        })]
    })
}
Q1.createRoot(document.getElementById("root")).render(u.jsx(M.StrictMode, {
    children: u.jsx(v3, {})
}));
