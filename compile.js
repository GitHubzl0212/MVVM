// 编译工具
let CompileUtil = {
    // 因为可能有data中的数据为嵌套的情况，所以要独立出来一个取值的方法
    getVal(vm, expr) {
        // "message.a.b.c.d..."这样的情况
        expr = expr.split('.') // 获取到的是一组数组 ['message', a', 'b', 'c', 'd', ...]
        // 能够把前一次的结果返回作为下一次的对象再取值用到方法reduce()
        // array.reduce(function(total, currentValue, currentIndex, arr), initialValue)
        // 返回了该指令或者该文本对应的data中的值
        return expr.reduce((prev, next) => {
            return prev[next];
        }, vm.$data)
    },
    getTextVal(vm, expr) {  // 获取编译文本后的结果
        return expr.replace(/\{\{([^}]+)\}\}/g, (...arguments) => {
            /* console.log(arguments) 
            return arguments[1];  // 返回的是"message.a.b...", 为啥 */
            return this.getVal(vm, arguments[1])
        })
    },
    text(node, vm, expr) {  // 文本处理
        let updateFn = this.updater['textUpdater'];
        // expr是带着花括号的 {{message.a.b...}} 花括号里面的内容替换成 hello, zl
        let value = this.getTextVal(vm, expr);
        // expr的形式为 {{a}} {{b}}
        // 同样这里也需要加监控，加之前要先对expr处理一下，expr变成a和b
        expr.replace(/\{\{([^}]+)\}\}/g, (...arguments) => {
            // 给每个文本节点都添加观察者
            new Watcher(vm, arguments[1], (newValue) => {
                // 如果数据变化了，文本节点需要重新获取依赖的属性更新文本中的内容?
                // 以为有可能{{a}}里面a发生了改变，变成了b 
                updateFn && updateFn(node, this.getTextVal(vm, expr));
            })
        })
        updateFn && updateFn(node, value);
    },
    setVal(vm, expr, value) {
        expr = expr.split(".");
        return expr.reduce((prev, next, currentIndex) => {
            if(currentIndex===expr.length-1) {
                return prev[next] = value;
            }
            return prev[next];
        }, vm.$data)
    },
    model(node, vm, expr) {  // 输入框处理
        let updateFn = this.updater['modelUpdater'];
        // 这里应该加一个监控，数据变化了应该调用这个watch的callback
        // 但这里不是一new就调用这个cb了，得有人调用watcher中的update，才回进而调用cb
        new Watcher(vm, expr, (newValue) => {
            // 当值变化后会调用cb，将新的值传递过来
            updateFn && updateFn(node, this.getVal(vm ,expr));
        });
        // 改变input中的数引起data中的数的改变
        node.addEventListener('input', (e) => {
            let newValue = e.target.value;
            this.setVal(vm, expr, newValue);
        })
        updateFn && updateFn(node, this.getVal(vm ,expr));
    },
    updater: {
        // 文本更新
        textUpdater(node, value) {
            // 这里要把文本中的{{message}}换成data中的message数据
            node.textContent = value;
        },
        // 输入框更新
        modelUpdater(node, value) {
            // 同理，这里要把input中的value换成data中的参数
            node.value = value;
        }
    }
}

// 编译的过程就是将数据更改好然后渲染到页面上
class Compile {
    constructor(el, vm) {
        // 但是要注意的是这里的el有可能是"#app"，是个字符串，也有可能是document.queryselector("#app")，是个dom元素
        // 所以我们不确定传递的是一个字符串还是一个dom元素
        // this.el = el;
        this.el = this.isElementNode(el) ? el : document.querySelector(el);
        this.vm = vm;
        if(this.el) {
            // 如果这个元素我们能获取到，我们才开始编译
            // 1. 先把这些真实的dom(指的是#app节点下的所有dom)移入到内存中，在内存中操作dom性能是比较好的，用到文档碎片fragment
            // 返回的是一个内存中的dom
            let fragment = this.node2fragment(this.el)
            // 2. 编译 => 提取想要的元素节点(v-model等)和文本节点({{内容}})
            this.compile(fragment);
            // 3. 把编译好的fragment再塞回到页面里去
            this.el.appendChild(fragment);
        }

    };
    /* 专门写一些辅助的方法 */
    isElementNode(node) {
        // 通过nodeType来判断是否是dom元素
        return node.nodeType === 1;
    }

    /* 核心的方法 */
    node2fragment(el) {  // 需要将el中的内容全部放到内存中去
        // 构建文档碎片，内存中的dom节点
        let fragment = document.createDocumentFragment();
        let firstChild;
        // appendChild相当于移动节点，原来位置上的dom元素就不存在了
        // 这里应该是用到了ES6中的默认值，然后每次判断firstChild是否存在
        while(firstChild = el.firstChild) {
            fragment.appendChild(firstChild);
        }
        return fragment;  // 内存中的el节点
    };
    // 用于判断是不是指令
    isDirective(name) {
        return name.includes('v-')
    };
    compileElement(node) {
        // 带v-model、v-text等等
        // 取出当前节点的属性
        let attr = node.attributes;  // 比如第一个节点的type、v-model就是第一个节点的属性
        // console.log(attr) // 类数组对象 NamedNodeMap
        Array.from(attr).forEach(attr => {
            // console.log(attr) // 打印出来的是第一个input框里的type="text"及v-model="message"，是键-值对的形式，所以可以取name和value
            // 判断属性名是不是包含v-，把其他的属性过滤掉
            let attrName = attr.name;
            if(this.isDirective(attrName)) {
                // 取到对应的值放到节点当中
                let expr = attr.value;  // 指的是v-model=后面的内容"message"
                // 现在有了node this.vm.$data expr
                // 对于不同的指令比如v-model v-text v-html要调用不同的指令，获取v-text后面的参数来判断
                // let type = attrName.slice(2);  // 就得到了"model"等等
                let [,type] = attrName.split('-');  // 得到了-后面的内容，作为请求类别
                CompileUtil[type](node, this.vm, expr);
            }
        })
    };
    compileText(node) {
        // 带{{}}
        let expr = node.textContent;  // 取文本中的内容  {{message.a.d....}}、hhh等
        // console.log(expr) 打印出所有除了标签元素的文本内容
        // 正则表达式，把带有模板表达式的抽出来，只剩下{{}}这种形式的文本
        // 大括号中间的内容除了花括号其他都行
        let reg = /\{\{([^}]+)\}\}/g;
        if(reg.test(expr)) {
            // node this.vm.$data text
            // todo........编译
            CompileUtil['text'](node, this.vm, expr);
        }
    };
    compile(fragment) {
        let childNodes = fragment.childNodes;
        // console.log(childNodes);  // 是一个nodelist数组，但是对于嵌套的<ul><li></li></ul>这种情况，childNodes是拿不到里面的li标签的
        // 所以需要递归
        // nodelist是类数组对象，所以要先转成数组
        Array.from(childNodes).forEach(node => {
            if(this.isElementNode(node)) {
                // console.log('element', node)
                // 这里需要编译元素
                this.compileElement(node);
                // 元素的类型还是是元素节点 v-model v-text等等，还需要继续深入的检查编译
                this.compile(node);
            } else {
                // 是文本节点  {{}}
                // console.log('text', node)
                // 这里需要编译文本
                this.compileText(node);
            }
        })
    }
}

