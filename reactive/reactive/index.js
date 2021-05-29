const isObject = (val) => val !== null && typeof val === "object";
const convert = (target) => (isObject(target) ? reactive(target) : target);
const hasOwnProperty = Object.prototype.hasOwnProperty
// 我们这里需要判断target对象有这个key值
const hasOwn = (target, key) => hasOwnProperty.call(target, key)
export function reactive(target) {
    if (!isObject(target)) return target;

    const handler = {
      get(target, key, receiver) {
        // 1. 收集依赖
        track(target, key)
        const result = Reflect.get(target, key, receiver);
        return convert(result);
      },
      set(target, key, value, receiver) {
        const oldValue = Reflect.get(target, key, receiver);
        let result = true;
        if (oldValue !== value) {
          result = Reflect.set(target, key, value, receiver);
          // 触发更新
          trigger(target, key)
        }
        return result;
      },
      deleteProperty(target, key) {
        const hasKey = hasOwn(target, key);
        const result = Reflect.deleteProperty(target, key);
        // 触发更新
        trigger(target, key)
        return result;
      },
    };

    return new Proxy(target, handler);
}
let activeEffect = null; // 记录当前callback
export function effect (callback) {
  console.log('effect')
  activeEffect = callback; // 这样就可以再创建track函数就可以调用callback了
  callback() // 访问响应式对象属性，去收集依赖
  activeEffect = null;
}

let targetMap = new WeakMap();
export function track(target, key) {
  if(!activeEffect) return
  let depsMap = targetMap.get(target);
  if(!depsMap){
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key);
  if(!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  dep.add(activeEffect)
}

export function trigger (target, key) {
  const depsMap = targetMap.get(target);
  if(!depsMap) return
  const dep = depsMap.get(key);
  if(dep) {
    dep.forEach(effect => {
      effect()
    })
  }
}