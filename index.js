const PENDING = "PENDING";
const FULFILLED = "fulfilled";
const REJECTED = "rejected"

function microTask(fn) {
    if (process && process.nextTick) {
        process.nextTick(fn)
    }
    else if (MutationObserver) {
        let observer = new MutationObserver(fn);
        let p = document.createElement("p");
        observer.observe(p)
        p.innerHTML = "1"
    }
    else {
        setTimeout(fn, 0)
    }
}

function promiseLike(ob) {
    return !!(typeof ob === "object" && ob.then && typeof ob.then === "function")
}




class myPromise {
    constructor(executor) {
        this.state = PENDING
        this.value = undefined
        this.handleList = []
        // 要绑定this避免this指向出错
        executor(this.resolve.bind(this), this.reject.bind(this))
    }
    resolve(data) {
        this.setState(FULFILLED, data)

    }
    reject(reason) {
        this.setState(REJECTED, reason)
    }
    setState(newstate, dataorreason) {
        if (this.state === PENDING) {
            this.value = dataorreason;
            this.state = newstate;
            this.executeList()
        }
        else
            return

    }

    executeList() {
        if (this.state === PENDING) return
        // 依次执行
        while (this.handleList[0]) {
            this.executeOne(this.handleList[0])
            this.handleList.shift()
        }

    }

    executeOne(item) {
        let { state, fn, resolve, reject } = item;
        if (state === this.state) {
            if (typeof fn !== "function") {
                this.state === REJECTED ? reject(this.value) : resolve(this.value)
            }
            else {
                microTask(() => {
                    try {
                        let res = fn(this.value)
                        if (promiseLike(res))
                            res.then(resolve, reject)
                        else
                            resolve(res)

                    } catch (error) {
                        reject(error)

                    }
                })
            }

        }
    }


    then(onFulfilled, onRejected) {
        return new myPromise((resolve, reject) => {
            this.handleList.push({ fn: onFulfilled, state: FULFILLED, resolve, reject })
            this.handleList.push({ fn: onRejected, state: REJECTED, resolve, reject })
            this.executeList()
        })

    }

    catch(onRejected) {
        return this.then(null, onRejected)
    }

    //finally有一些不同finally返回的promise状态和值都与前一个相同，不会受到其执行函数的影响
    finally(onSattled) {
        return this.then((data) => {
            onSattled(data);
            return data;
        }, (err) => {
            onSattled(err)
            throw new Error(err)
        })
    }

    static resolve(data) {
        if (data instanceof myPromise)
            return data
        return new myPromise((resolve, reject) => {
            if (promiseLike(data))
                data.then(resolve, reject)
            else
                resolve(data)
        })
    }

    static reject(reason) {
        return new myPromise((resolve, reject) => {
            reject(reason)
        })
    }

    static all(proms) {
        return new myPromise((resolve, reject) => {
            let fulfilledCount = 0;
            let res = new Array(proms.length);
            for (let i = 0; i < proms.length; i++) {
                let index = i;
                myPromise.resolve(proms[i]).then((data) => {
                    fulfilledCount++;
                    res[index] = data;
                    if (fulfilledCount === proms.length) {
                        resolve(res)
                    }
                }, (reason) => {
                    reject(reason)
                })
            }
        })
    }

    static race(proms) {
        return new myPromise((resolve, reject) => {
            proms.forEach(pro => {
                pro.then((data) => {
                    resolve(data)
                }, (reason) => {
                    reject(reason)
                })
            });
        })

    }

    static allSettled(proms) {
        
        return new myPromise((resolve) => {
            let res = [];
            let settledCount=0
            for (let i = 0; i < proms.length; i++) {
                const pro = myPromise.resolve(proms[i]);
                let index = i;
                pro.then((data) => {
                    res[i] = { state: FULFILLED, value: data }
                }, (reason) => {
                    res[i] = { state: REJECTED, value: reason }
                }).finally(()=>{
                    settledCount++;
                    if(settledCount===proms.length)
                    {
                        resolve(res)
                    }
                })

            }
        })
    }
}

let p = myPromise.allSettled([new myPromise((resolve, reject) => {
    setTimeout(() => {
        resolve(2121)
    }, 1000);
}), myPromise.reject(2)])

p.then((data)=>{
    console.log(data);
})








