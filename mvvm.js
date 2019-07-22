class MVVM {
    constructor(options) {
        // 一上来先把可用的东西挂载在实例上
        this.$el = options.el;
        this.$data = options.data;
        // 如果有要编译的模板就开始编译
        if(this.$el) {
            // 数据劫持，就是把对象的所有属性改成get和set方法
            new Observer(this.$data);
            this.proxyData(this.$data);
            // 用数据和元素进行编译
            // 编译方法写在类里，好扩展
            // 这里的this指的是mvvm的实例，即 vm
            // compile指的是将v-model或者{{}}编译出来，得到对应的data中的参数，然后展示到v-model中，或是{{}}中
            // this指向是mvvm实例（可以再看一下this的指向）
            new Compile(this.$el, this);   // 将data中的数据显示在带有v-model或是{{}}中

        }
    }
    proxyData(data) {
        Object.keys(data).forEach(key => {
            Object.defineProperty(this, key, {
                get() {
                    return data[key]
                },
                set() {
                    data[key] = newValue;
                }
            })
        })
    }
}