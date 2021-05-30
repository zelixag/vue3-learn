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

export function ref (raw) {
  // 判断raw 是否是ref创建的对象，如果是直接返回
  if(isObject(raw) && raw.__v_isRef) {
    return raw
  }

  // 如果是一个普通对象则convert那里调用reactive，如果是原始类型值直接返回
  let value = convert(raw);
  // 创建一个对象，并添加一个value属性成员，生成响应式对象。并做标记是通过ref生成的
  const result = {
    __v_isRef: true,
    get value () {
      track(result, 'value')
      return value
    },
    set value (newValue) {
      if(newValue !== value) {
        raw = newValue
        value = convert(raw);
        trigger(result, 'value')
      }
    }
  }
  return result
}

export function toRefs (proxy) {
  const ret = proxy instanceof Array ? new Array(proxy.length) : {}

  for(const key in proxy) {
    ret[key] = toProxyRef(proxy, key)// 返回类似的ref对象，没有进行依赖收集
  }
  return ret
}

function toProxyRef (proxy, key) {
  const r = {
    __v_isRef: true,
    get value () {
      // 这里不需要去收集依赖，因为这里会有自身的proxy里面去收集
      return proxy[key] // 当这样访问proxy对象的key属性时就会触发proxy对象依赖收集
    },
    set value(newValue) {
      proxy[key] = newValue // 这设置值的时候也会触发proxy key的更新
    }
  }
  return r
}

export function computed (getter) {
  const result = ref();
  effect(() => (result.value = getter()))

  return result
}