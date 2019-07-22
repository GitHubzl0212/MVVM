// 观察者的目的就是给需要变化的那个元素增加一个观察者，当数据发生变化是触发相应的方法
// observer的作用就是用新值和旧值进行比对，如果发生变化，就调用更新方法
// vue中的watch()方法就是依赖的下面的这个watcher类
// 传进来的expr是"message.a.b"、"b"这类参数
class Watcher {
    constructor(vm, expr, cb) {
        this.vm = vm;
        this.expr = expr;
        this.cb = cb;
        // 先获取下旧值，一旦new出实例就取旧值
        this.value = this.get();
    }
    getVal(vm, expr) {
        expr = expr.split('.');
        return expr.reduce((prev, next) => {
            return prev[next];
        }, vm.$data);
    }
    get() { 
        // this指的即将构造出来的watcher的实例
        Dep.target = this;
        let value = this.getVal(this.vm, this.expr)
        Dep.target = null;
        return value;
    }
    // 对外暴露的方法
    update() {
        let newValue = this.getVal(this.vm, this.expr);
        let oldValue = this.value;
        if(newValue !== oldValue) {
            // 调用watch的callback
            this.cb(newValue);  
        }
    }
}

// 在compile中new watcher的时候，就会执行Dep.target=this)（get方法中），然后继而会取data上的值，这个时候就会触发observer中的get方法，
// 然后顺势在observer中new Dep，本质上就是一new watcher，就会收集watcher实例，在observer的get中Dep.target && dep.addSub(Dep.target)；
// watcher是对应data中的数发生变化时才会实例化，然后才有了收集watcher的操作。
// 用完之后Dep.target=null;