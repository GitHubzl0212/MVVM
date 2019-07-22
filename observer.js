class Observer {
    constructor(data) {
        this.observe(data);
    }
    observe(data) {
        // 要将这个data数据原有的属性改成get和set形式
        // data要满足：1. 存在 2. 是个对象，常数的话不能赋值，没有意义
        if (!data || typeof data !== "object") {
            // 这种情况不需要劫持
            return;
        }
        // 要将数据一一劫持，先获取到data的key和value
        // console.log(Object.keys(data)) 获取到所有的可枚举属性
        Object.keys(data).forEach(key => {
            this.defineReactive(data, key, data[key]);
            // 深度递归劫持
            this.observe(data[key]);
        })
    }
    // 定义响应式
    defineReactive(obj, key, value) {
        let that = this;
        let dep = new Dep(); //每个变化的数据都会对应一个数组，这个数组是存放所有更新的操作
        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get() {
                // todo...取值的时候可以做一些动作
                Dep.target && dep.addSub(Dep.target);
                return value;
            },
            set(newValue) {
                if(newValue !== value) {
                    // 这里的this不是实例
                    // 对于修改后的新值也要验证是否为对象来进行劫持，在控制台中可以通过vm.$data来查看
                    that.observe(newValue);
                    value = newValue;
                    dep.notify(); // 通知所有人，数据更新了
                }
            }
        })
    }
}

// 验证observer的时候通过在控制台输入vm.$data来查看，或者通过vm.$data.message = {b: "hh"}来修改查看是否被劫持

class Dep {
    constructor() {
        // 订阅的数组
        this.subs = []
    }
    addSub(watcher) {
        this.subs.push(watcher);
    }
    notify() {
        // 执行update的时候表单和文本都重新赋值
        this.subs.forEach(watcher => watcher.update());
    }
}