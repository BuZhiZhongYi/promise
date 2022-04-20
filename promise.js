//自定义Promise函数模块  IIFE
(function (window) {

    //Promise构造函数
    //excutor执行器函数(同步执行)

    const PENDING = 'pending'
    const RESOLVED = 'resolved'
    const REJECTED = 'rejected'


    function Promise(excutor) {
        const self = this
        self.status = PENDING //给promise对象指定status属性,初始值为pending
        self.data = undefined //给promise对象指定一个用于存储结果数据的属性 value/reason
        self.callbacks = [] //每个元素的结构 { onResolved() {},onResolved() {}}

        function resolve(value) {
            //如果当前状态不是pending,直接结束
            if (self.status !== PENDING) {
                return
            }

            //将状态改为resolved
            self.status = RESOLVED
            //保存value数据
            self.data = value
            //如果有待执行的callback函数,立即异步执行回调函数onResolved
            if (self.callbacks.length > 0) {
                setTimeout(() => {  //放入队列中执行所有成功的回调
                    self.callbacks.forEach(callbacksOBJ => {
                        callbacksOBJ.onResolved(value)
                    });
                });
            }

        }

        function reject(reason) {
            //将状态改为rejected
            self.status = REJECTED
            //保存value数据
            self.data = reason
            //如果有待执行的callback函数,立即异步执行回调函数onRejected
            if (self.callbacks.length > 0) {
                setTimeout(() => {  //放入队列中执行所有成功的回调
                    self.callbacks.forEach(callbacksOBJ => {
                        callbacksOBJ.onRejected(reason)
                    });
                });
            }
        }

        //同步执行excutor函数

        try {
            excutor(resolve, reject)
        } catch (error) { //如果执行器抛出异常,promise对象变为rejected状态
            reject(error)
        }

    }



    //Promise原型上的then方法
    //指定成功和失败的回调函数
    //返回新的promise
    Promise.prototype.then = function (onResolved, onRejected) {

        onResolved = typeof onResolved === 'function' ? onResolved : value => value //向后传递成功的value
        //指定默认的失败的回调(异常穿透)
        onRejected = typeof onRejected === 'function' ? onResolved : reason => { throw reason } //向后传递失败的reason

        const self = this

        //返回一个新的promise对象
        return new Promise((resolve, reject) => {

            //调用指定的回调函数处理
            function handle(callback) {
                //如果抛出异常,return的promise就会失败,reason就是error
                //如果回调函数返回不是promise,return的promise就会成功,value就是返回的值
                //如果回调函数返回是promise,return的promise结果就是这个promise结果
                try {
                    const result = callback(self.data)
                    if (result instanceof Promise) {

                        //如果回调函数返回是promise,return的promise结果就是这个promise结果
                        // result.then(
                        //     value => resolve(value),
                        //     reason => reject(reason)
                        // )

                        result.then(resolve, reject)
                    } else {
                        //如果回调函数返回不是promise,return的promise就会成功,value就是返回的值
                        resolve(result)
                    }
                } catch (error) {
                    //如果抛出异常,return的promise就会失败,reason就是error
                    reject(error)
                }
            }

            //当前是pending状态,将回调函数保存起来 
            if (self.status === PENDING) {
                self.callbacks.push({
                    onResolved(value) {
                        handle(onResolved)
                    },
                    onRejected(reason) {
                        handle(onRejected)
                    }
                })
            } else if (self.status === RESOLVED) {  //当前是resolved状态,异步执行onResolved函数并改变return的promise的状态
                setTimeout(() => {
                    handle(onResolved)
                })
            } else {
                setTimeout(() => {
                    handle(onRejected)
                })
            }
        })
    }

    //Promise原型上的catch方法
    //指定失败的回调函数
    //返回新的promise
    Promise.prototype.catch = function (onRejected) {
        return this.then(undefined, onRejected)
    }

    //Promise函数对象的resolve方法
    //返回一个指定结果的成功的promise
    Promise.resolve = function (value) {
        //返回一个成功/失败的promise对象
        return new Promise((resolve, reject) => {
            //value是promise
            if (value instanceof Promise) {
                //使用value的结果作为当前promise的结果
                value.then(resolve, reject)
            } else {
                //value不是promise
                resolve(value)
            }
        })
    }

    //Promise函数对象的reject方法
    //返回一个指定结果的失败的promise
    Promise.reject = function (reason) {
        //返回一个失败的promise对象
        return new Promise((resolve, reject) => {
            reject(reason)
        })
    }

    //all方法,接收promise数组
    //返回一个promise
    //当所有为成功才为成功
    Promise.all = function (promises) {
        //创建一个数组,用来保存成功的promise
        const values = new Array(promises.length)
        //创建一个values计数器
        let valuesCount = 0
        //返回一个新的promise
        return new Promise((resolve, reject) => {
            //遍历promises数组
            promises.forEach((p, index) => {
                //其中的p可能不是promise
                //标准语法中允许p为其他值
                //因此可以将p包装成promise
                //p为promise,则无影响
                //p不为promise,直接返回成功的promise
                Promise.resolve(p).then(
                    value => {
                        //将成功的结果利用index放入数组中
                        values[index] = value
                        //当进入一次onResolved计数器就加一
                        valuesCount++
                        //如果进入的次数和promises的长度一致
                        //则resolve
                        if (valuesCount === promises.length) {
                            resolve(values)
                        }
                    },
                    reason => {
                        //有一个失败就返回失败
                        reject(reason)
                    }
                )
            })
        })
    }

    //race方法,接收promise数组
    //返回一个promise
    //结果由第一个完成的promise决定
    Promise.race = function (promises) {
        //返回一个新的promise
        return new Promise((resolve, reject) => {
            //遍历promises数组
            promises.forEach((p, index) => {
                Promise.resolve(p).then(
                    value => {
                        resolve(value)
                    },
                    reason => {
                        //第一个完成的结果是失败就返回失败
                        reject(reason)
                    }
                )
            })
        })
    }

    //返回一个promise对象,在指定事件后返回结果
    Promise.resolveDelay = function (value, time) {

        //返回一个成功/失败的promise对象
        return new Promise((resolve, reject) => {
            //延迟
            setTimeout(() => {
                //value是promise
                if (value instanceof Promise) {
                    //使用value的结果作为当前promise的结果
                    value.then(resolve, reject)
                } else {
                    //value不是promise
                    resolve(value)
                }
            }, time);
        })
    }

    //返回一个promise对象,在指定时间后失败
    Promise.rejectDelay = function (reason, time) {
        //返回一个失败的promise对象
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(reason)
            }, time);
        })
    }

    //向外暴露Promise
    window.Promise = Promise
})(window)