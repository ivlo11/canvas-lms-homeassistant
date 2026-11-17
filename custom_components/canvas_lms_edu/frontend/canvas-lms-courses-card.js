var I=globalThis,L=I.ShadowRoot&&(I.ShadyCSS===void 0||I.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,F=Symbol(),ae=new WeakMap,P=class{constructor(e,t,s){if(this._$cssResult$=!0,s!==F)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(L&&e===void 0){let s=t!==void 0&&t.length===1;s&&(e=ae.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&ae.set(t,e))}return e}toString(){return this.cssText}},ce=n=>new P(typeof n=="string"?n:n+"",void 0,F),V=(n,...e)=>{let t=n.length===1?n[0]:e.reduce((s,i,r)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+n[r+1],n[0]);return new P(t,n,F)},le=(n,e)=>{if(L)n.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of e){let s=document.createElement("style"),i=I.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=t.cssText,n.appendChild(s)}},W=L?n=>n:n=>n instanceof CSSStyleSheet?(e=>{let t="";for(let s of e.cssRules)t+=s.cssText;return ce(t)})(n):n;var{is:Ke,defineProperty:Ye,getOwnPropertyDescriptor:Ze,getOwnPropertyNames:Je,getOwnPropertySymbols:Ge,getPrototypeOf:Qe}=Object,y=globalThis,de=y.trustedTypes,Xe=de?de.emptyScript:"",K=y.reactiveElementPolyfillSupport,T=(n,e)=>n,Y={toAttribute(n,e){switch(e){case Boolean:n=n?Xe:null;break;case Object:case Array:n=n==null?n:JSON.stringify(n)}return n},fromAttribute(n,e){let t=n;switch(e){case Boolean:t=n!==null;break;case Number:t=n===null?null:Number(n);break;case Object:case Array:try{t=JSON.parse(n)}catch{t=null}}return t}},fe=(n,e)=>!Ke(n,e),he={attribute:!0,type:String,converter:Y,reflect:!1,useDefault:!1,hasChanged:fe},pe,ue;(pe=Symbol.metadata)!=null||(Symbol.metadata=Symbol("metadata")),(ue=y.litPropertyMetadata)!=null||(y.litPropertyMetadata=new WeakMap);var _=class extends HTMLElement{static addInitializer(e){var t;this._$Ei(),((t=this.l)!=null?t:this.l=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=he){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let s=Symbol(),i=this.getPropertyDescriptor(e,s,t);i!==void 0&&Ye(this.prototype,e,i)}}static getPropertyDescriptor(e,t,s){var o;let{get:i,set:r}=(o=Ze(this.prototype,e))!=null?o:{get(){return this[t]},set(c){this[t]=c}};return{get:i,set(c){let a=i==null?void 0:i.call(this);r==null||r.call(this,c),this.requestUpdate(e,a,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){var t;return(t=this.elementProperties.get(e))!=null?t:he}static _$Ei(){if(this.hasOwnProperty(T("elementProperties")))return;let e=Qe(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(T("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(T("properties"))){let t=this.properties,s=[...Je(t),...Ge(t)];for(let i of s)this.createProperty(i,t[i])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[s,i]of t)this.elementProperties.set(s,i)}this._$Eh=new Map;for(let[t,s]of this.elementProperties){let i=this._$Eu(t,s);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let s=new Set(e.flat(1/0).reverse());for(let i of s)t.unshift(W(i))}else e!==void 0&&t.push(W(e));return t}static _$Eu(e,t){let s=t.attribute;return s===!1?void 0:typeof s=="string"?s:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var e;this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),(e=this.constructor.l)==null||e.forEach(t=>t(this))}addController(e){var t,s;((t=this._$EO)!=null?t:this._$EO=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&((s=e.hostConnected)==null||s.call(e))}removeController(e){var t;(t=this._$EO)==null||t.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let s of t.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){var t;let e=(t=this.shadowRoot)!=null?t:this.attachShadow(this.constructor.shadowRootOptions);return le(e,this.constructor.elementStyles),e}connectedCallback(){var e,t;(e=this.renderRoot)!=null||(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(t=this._$EO)==null||t.forEach(s=>{var i;return(i=s.hostConnected)==null?void 0:i.call(s)})}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$EO)==null||e.forEach(t=>{var s;return(s=t.hostDisconnected)==null?void 0:s.call(t)})}attributeChangedCallback(e,t,s){this._$AK(e,s)}_$ET(e,t){var r;let s=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,s);if(i!==void 0&&s.reflect===!0){let o=(((r=s.converter)==null?void 0:r.toAttribute)!==void 0?s.converter:Y).toAttribute(t,s.type);this._$Em=e,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(e,t){var r,o,c;let s=this.constructor,i=s._$Eh.get(e);if(i!==void 0&&this._$Em!==i){let a=s.getPropertyOptions(i),l=typeof a.converter=="function"?{fromAttribute:a.converter}:((r=a.converter)==null?void 0:r.fromAttribute)!==void 0?a.converter:Y;this._$Em=i;let d=l.fromAttribute(t,a.type);this[i]=(c=d!=null?d:(o=this._$Ej)==null?void 0:o.get(i))!=null?c:d,this._$Em=null}}requestUpdate(e,t,s,i=!1,r){var o,c;if(e!==void 0){let a=this.constructor;if(i===!1&&(r=this[e]),s!=null||(s=a.getPropertyOptions(e)),!(((o=s.hasChanged)!=null?o:fe)(r,t)||s.useDefault&&s.reflect&&r===((c=this._$Ej)==null?void 0:c.get(e))&&!this.hasAttribute(a._$Eu(e,s))))return;this.C(e,t,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:s,reflect:i,wrapped:r},o){var c,a,l;s&&!((c=this._$Ej)!=null?c:this._$Ej=new Map).has(e)&&(this._$Ej.set(e,(a=o!=null?o:t)!=null?a:this[e]),r!==!0||o!==void 0)||(this._$AL.has(e)||(this.hasUpdated||s||(t=void 0),this._$AL.set(e,t)),i===!0&&this._$Em!==e&&((l=this._$Eq)!=null?l:this._$Eq=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var s,i;if(!this.isUpdatePending)return;if(!this.hasUpdated){if((s=this.renderRoot)!=null||(this.renderRoot=this.createRenderRoot()),this._$Ep){for(let[o,c]of this._$Ep)this[o]=c;this._$Ep=void 0}let r=this.constructor.elementProperties;if(r.size>0)for(let[o,c]of r){let{wrapped:a}=c,l=this[o];a!==!0||this._$AL.has(o)||l===void 0||this.C(o,void 0,c,l)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),(i=this._$EO)==null||i.forEach(r=>{var o;return(o=r.hostUpdate)==null?void 0:o.call(r)}),this.update(t)):this._$EM()}catch(r){throw e=!1,this._$EM(),r}e&&this._$AE(t)}willUpdate(e){}_$AE(e){var t;(t=this._$EO)==null||t.forEach(s=>{var i;return(i=s.hostUpdated)==null?void 0:i.call(s)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(t=>this._$ET(t,this[t]))),this._$EM()}updated(e){}firstUpdated(e){}},me;_.elementStyles=[],_.shadowRootOptions={mode:"open"},_[T("elementProperties")]=new Map,_[T("finalized")]=new Map,K==null||K({ReactiveElement:_}),((me=y.reactiveElementVersions)!=null?me:y.reactiveElementVersions=[]).push("2.1.2");var O=globalThis,ge=n=>n,z=O.trustedTypes,_e=z?z.createPolicy("lit-html",{createHTML:n=>n}):void 0,Ee="$lit$",$=`lit$${Math.random().toFixed(9).slice(2)}$`,we="?"+$,et=`<${we}>`,x=document,H=()=>x.createComment(""),k=n=>n===null||typeof n!="object"&&typeof n!="function",se=Array.isArray,tt=n=>se(n)||typeof(n==null?void 0:n[Symbol.iterator])=="function",Z=`[ 	
\f\r]`,N=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ye=/-->/g,$e=/>/g,A=RegExp(`>|${Z}(?:([^\\s"'>=/]+)(${Z}*=${Z}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),ve=/'/g,Ae=/"/g,Se=/^(?:script|style|textarea|title)$/i,ie=n=>(e,...t)=>({_$litType$:n,strings:e,values:t}),u=ie(1),mt=ie(2),ft=ie(3),E=Symbol.for("lit-noChange"),p=Symbol.for("lit-nothing"),be=new WeakMap,b=x.createTreeWalker(x,129);function Ce(n,e){if(!se(n)||!n.hasOwnProperty("raw"))throw Error("invalid template strings array");return _e!==void 0?_e.createHTML(e):e}var st=(n,e)=>{let t=n.length-1,s=[],i,r=e===2?"<svg>":e===3?"<math>":"",o=N;for(let c=0;c<t;c++){let a=n[c],l,d,h=-1,m=0;for(;m<a.length&&(o.lastIndex=m,d=o.exec(a),d!==null);)m=o.lastIndex,o===N?d[1]==="!--"?o=ye:d[1]!==void 0?o=$e:d[2]!==void 0?(Se.test(d[2])&&(i=RegExp("</"+d[2],"g")),o=A):d[3]!==void 0&&(o=A):o===A?d[0]===">"?(o=i!=null?i:N,h=-1):d[1]===void 0?h=-2:(h=o.lastIndex-d[2].length,l=d[1],o=d[3]===void 0?A:d[3]==='"'?Ae:ve):o===Ae||o===ve?o=A:o===ye||o===$e?o=N:(o=A,i=void 0);let f=o===A&&n[c+1].startsWith("/>")?" ":"";r+=o===N?a+et:h>=0?(s.push(l),a.slice(0,h)+Ee+a.slice(h)+$+f):a+$+(h===-2?c:f)}return[Ce(n,r+(n[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),s]},M=class n{constructor({strings:e,_$litType$:t},s){let i;this.parts=[];let r=0,o=0,c=e.length-1,a=this.parts,[l,d]=st(e,t);if(this.el=n.createElement(l,s),b.currentNode=this.el.content,t===2||t===3){let h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(i=b.nextNode())!==null&&a.length<c;){if(i.nodeType===1){if(i.hasAttributes())for(let h of i.getAttributeNames())if(h.endsWith(Ee)){let m=d[o++],f=i.getAttribute(h).split($),v=/([.?@])?(.*)/.exec(m);a.push({type:1,index:r,name:v[2],strings:f,ctor:v[1]==="."?Q:v[1]==="?"?X:v[1]==="@"?ee:R}),i.removeAttribute(h)}else h.startsWith($)&&(a.push({type:6,index:r}),i.removeAttribute(h));if(Se.test(i.tagName)){let h=i.textContent.split($),m=h.length-1;if(m>0){i.textContent=z?z.emptyScript:"";for(let f=0;f<m;f++)i.append(h[f],H()),b.nextNode(),a.push({type:2,index:++r});i.append(h[m],H())}}}else if(i.nodeType===8)if(i.data===we)a.push({type:2,index:r});else{let h=-1;for(;(h=i.data.indexOf($,h+1))!==-1;)a.push({type:7,index:r}),h+=$.length-1}r++}}static createElement(e,t){let s=x.createElement("template");return s.innerHTML=e,s}};function C(n,e,t=n,s){var o,c,a;if(e===E)return e;let i=s!==void 0?(o=t._$Co)==null?void 0:o[s]:t._$Cl,r=k(e)?void 0:e._$litDirective$;return(i==null?void 0:i.constructor)!==r&&((c=i==null?void 0:i._$AO)==null||c.call(i,!1),r===void 0?i=void 0:(i=new r(n),i._$AT(n,t,s)),s!==void 0?((a=t._$Co)!=null?a:t._$Co=[])[s]=i:t._$Cl=i),i!==void 0&&(e=C(n,i._$AS(n,e.values),i,s)),e}var G=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){var l;let{el:{content:t},parts:s}=this._$AD,i=((l=e==null?void 0:e.creationScope)!=null?l:x).importNode(t,!0);b.currentNode=i;let r=b.nextNode(),o=0,c=0,a=s[0];for(;a!==void 0;){if(o===a.index){let d;a.type===2?d=new D(r,r.nextSibling,this,e):a.type===1?d=new a.ctor(r,a.name,a.strings,this,e):a.type===6&&(d=new te(r,this,e)),this._$AV.push(d),a=s[++c]}o!==(a==null?void 0:a.index)&&(r=b.nextNode(),o++)}return b.currentNode=x,i}p(e){let t=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(e,s,t),t+=s.strings.length-2):s._$AI(e[t])),t++}},D=class n{get _$AU(){var e,t;return(t=(e=this._$AM)==null?void 0:e._$AU)!=null?t:this._$Cv}constructor(e,t,s,i){var r;this.type=2,this._$AH=p,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=s,this.options=i,this._$Cv=(r=i==null?void 0:i.isConnected)!=null?r:!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&(e==null?void 0:e.nodeType)===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=C(this,e,t),k(e)?e===p||e==null||e===""?(this._$AH!==p&&this._$AR(),this._$AH=p):e!==this._$AH&&e!==E&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):tt(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==p&&k(this._$AH)?this._$AA.nextSibling.data=e:this.T(x.createTextNode(e)),this._$AH=e}$(e){var r;let{values:t,_$litType$:s}=e,i=typeof s=="number"?this._$AC(e):(s.el===void 0&&(s.el=M.createElement(Ce(s.h,s.h[0]),this.options)),s);if(((r=this._$AH)==null?void 0:r._$AD)===i)this._$AH.p(t);else{let o=new G(i,this),c=o.u(this.options);o.p(t),this.T(c),this._$AH=o}}_$AC(e){let t=be.get(e.strings);return t===void 0&&be.set(e.strings,t=new M(e)),t}k(e){se(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,s,i=0;for(let r of e)i===t.length?t.push(s=new n(this.O(H()),this.O(H()),this,this.options)):s=t[i],s._$AI(r),i++;i<t.length&&(this._$AR(s&&s._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){var s;for((s=this._$AP)==null?void 0:s.call(this,!1,!0,t);e!==this._$AB;){let i=ge(e).nextSibling;ge(e).remove(),e=i}}setConnected(e){var t;this._$AM===void 0&&(this._$Cv=e,(t=this._$AP)==null||t.call(this,e))}},R=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,s,i,r){this.type=1,this._$AH=p,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=r,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=p}_$AI(e,t=this,s,i){let r=this.strings,o=!1;if(r===void 0)e=C(this,e,t,0),o=!k(e)||e!==this._$AH&&e!==E,o&&(this._$AH=e);else{let c=e,a,l;for(e=r[0],a=0;a<r.length-1;a++)l=C(this,c[s+a],t,a),l===E&&(l=this._$AH[a]),o||(o=!k(l)||l!==this._$AH[a]),l===p?e=p:e!==p&&(e+=(l!=null?l:"")+r[a+1]),this._$AH[a]=l}o&&!i&&this.j(e)}j(e){e===p?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e!=null?e:"")}},Q=class extends R{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===p?void 0:e}},X=class extends R{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==p)}},ee=class extends R{constructor(e,t,s,i,r){super(e,t,s,i,r),this.type=5}_$AI(e,t=this){var o;if((e=(o=C(this,e,t,0))!=null?o:p)===E)return;let s=this._$AH,i=e===p&&s!==p||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,r=e!==p&&(s===p||i);i&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var t,s;typeof this._$AH=="function"?this._$AH.call((s=(t=this.options)==null?void 0:t.host)!=null?s:this.element,e):this._$AH.handleEvent(e)}},te=class{constructor(e,t,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){C(this,e)}};var J=O.litHtmlPolyfillSupport,xe;J==null||J(M,D),((xe=O.litHtmlVersions)!=null?xe:O.litHtmlVersions=[]).push("3.3.3");var Re=(n,e,t)=>{var r,o;let s=(r=t==null?void 0:t.renderBefore)!=null?r:e,i=s._$litPart$;if(i===void 0){let c=(o=t==null?void 0:t.renderBefore)!=null?o:null;s._$litPart$=i=new D(e.insertBefore(H(),c),c,void 0,t!=null?t:{})}return i._$AI(n),i};var w=globalThis,g=class extends _{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var t,s;let e=super.createRenderRoot();return(s=(t=this.renderOptions).renderBefore)!=null||(t.renderBefore=e.firstChild),e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Re(t,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return E}},Pe;g._$litElement$=!0,g.finalized=!0,(Pe=w.litElementHydrateSupport)==null||Pe.call(w,{LitElement:g});var ne=w.litElementPolyfillSupport;ne==null||ne({LitElement:g});var Te;((Te=w.litElementVersions)!=null?Te:w.litElementVersions=[]).push("4.2.2");var S="canvas_lms_edu",Ne="course_grade",Oe="get_unsubmitted_assignments",j="canvas-lms-courses-card";var He=n=>typeof n=="number"?n:void 0;function ke(n){var e,t,s,i;return(i=(s=(e=n.primary_config_entry)!=null?e:n.config_entry_id)!=null?s:(t=n.config_entries)==null?void 0:t[0])!=null?i:void 0}function Me(n){return n.name_by_user||n.name||""}function it(n,e){if(typeof n!="string")return"";let t=n;for(let s of[e==null?void 0:e.name_by_user,e==null?void 0:e.name])if(s&&t.startsWith(`${s} `)){t=t.slice(s.length+1);break}return t.replace(/ grade$/,"")}function De(n,e,t=new Map){var r,o,c,a;let s=[];for(let l of Object.values(n.entities)){if(l.platform!==S||l.device_id!==e||l.translation_key!==Ne)continue;let d=n.states[l.entity_id];if(!d)continue;let h=d.attributes,m=t.get(l.entity_id),f=h.teachers,v={entityId:l.entity_id,name:typeof h.course_name=="string"&&h.course_name||(m==null?void 0:m.name)||it(h.friendly_name,n.devices[e])||l.entity_id,teachers:Array.isArray(f)?f.filter(We=>typeof We=="string"):(r=m==null?void 0:m.teachers)!=null?r:[],state:d.state,courseId:(o=He(h.course_id))!=null?o:m==null?void 0:m.courseId,studentId:(c=He(h.student_id))!=null?c:m==null?void 0:m.studentId};t.set(l.entity_id,v),s.push(v)}let i=((a=n.locale)==null?void 0:a.language)||void 0;return s.sort((l,d)=>l.name.localeCompare(d.name,i,{sensitivity:"base"})||l.entityId.localeCompare(d.entityId))}var Ue="home-assistant";function B(n,e,t=()=>window.customElements,s=5e3){let i=t();if(i.get(n))return;i.define(n,e);let r=!1,o=a=>{if(r)return;r=!0,clearTimeout(c);let l=t();if(!l.get(n))try{l.define(n,class extends e{}),console.info(`Canvas LMS: defined <${n}> again in the dashboard's registry (${a})`)}catch(d){console.warn(`Canvas LMS: could not define <${n}> again (${a})`,d)}},c=setTimeout(()=>o("fallback"),s);i.whenDefined(Ue).then(()=>o(Ue),()=>{})}var re="canvas-lms-courses-card-editor",nt=[{name:"device_id",required:!0,selector:{device:{filter:{integration:S}}}},{name:"title",selector:{text:{}}}],rt={device_id:"Student",title:"Title (optional)"},q=class extends g{setConfig(e){this._config=e}render(){return this._config?u`<ha-form
      .hass=${this.hass}
      .data=${this._config}
      .schema=${nt}
      .computeLabel=${e=>{var t;return(t=rt[e.name])!=null?t:e.name}}
      @value-changed=${this._changed}
    ></ha-form>`:u``}_changed(e){e.stopPropagation();let t={...this._config,...e.detail.value};t.title||delete t.title,this._config=t,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:t},bubbles:!0,composed:!0}))}};q.properties={hass:{attribute:!1},_config:{state:!0}};B(re,q);function oe(n){if(n===void 0||n.trim()==="")return"\u2014";let e=Number(n);return Number.isFinite(e)?`${e}%`:"\u2014"}var Ie=n=>{var e;return((e=n==null?void 0:n.locale)==null?void 0:e.language)||void 0};function Le(n,e){var r,o;if(!n)return"";let t=new Date(n);if(Number.isNaN(t.getTime()))return"";let s=((r=e==null?void 0:e.locale)==null?void 0:r.time_zone)==="server"?(o=e.config)==null?void 0:o.time_zone:void 0,i=c=>new Intl.DateTimeFormat(Ie(e),{dateStyle:"medium",timeStyle:"short",timeZone:c}).format(t);try{return i(s)}catch{return i(void 0)}}function ze(n,e){return n==null?"":`${new Intl.NumberFormat(Ie(e),{maximumFractionDigits:2}).format(n)} ${n===1?"pt":"pts"}`}var je=n=>{if(!n.due_at)return null;let e=Date.parse(n.due_at);return Number.isNaN(e)?null:e},Be=(n,e)=>{let[t,s]=[je(n),je(e)];return t===s?0:t===null?1:s===null?-1:t-s},ot=(n,e)=>{let[t,s]=[n.points_possible,e.points_possible];return t===s?0:t==null?1:s==null?-1:s-t},at=n=>(e,t)=>{var s,i;return((s=e.name)!=null?s:"").localeCompare((i=t.name)!=null?i:"",n,{sensitivity:"base"})};function qe(n,e,t){let s=at(t),i=e==="points"?ot:e==="name"?s:Be;return[...n].sort((r,o)=>i(r,o)||Be(r,o)||s(r,o)||r.assignment_id-o.assignment_id)}var Fe=V`
  :host {
    display: block;
  }
  ha-card {
    display: block;
    overflow: hidden;
    color: var(--primary-text-color);
  }
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 16px 8px;
  }
  .title {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--ha-card-header-font-family, inherit);
    font-size: var(--ha-card-header-font-size, 1.5rem);
    font-weight: 400;
    line-height: 1.3;
    color: var(--ha-card-header-color, var(--primary-text-color));
  }
  ul {
    margin: 0;
    padding: 0 0 8px;
    list-style: none;
  }
  button,
  a {
    font: inherit;
    color: inherit;
  }
  button {
    border: 0;
    background: none;
    cursor: pointer;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 16px;
    box-sizing: border-box;
    width: 100%;
    min-height: 56px;
    padding: 8px 16px;
    text-align: start;
    text-decoration: none;
  }
  .row:hover {
    background: var(--secondary-background-color);
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .primary,
  .secondary {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .primary {
    font-size: 1rem;
    line-height: 1.4;
  }
  .secondary {
    min-height: 1.4em;
    font-size: 0.85rem;
    line-height: 1.4;
    color: var(--secondary-text-color);
  }
  .grade {
    flex: none;
    font-size: 1.15rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .points {
    flex: none;
    font-size: 0.9rem;
    color: var(--secondary-text-color);
    white-space: nowrap;
  }
  .missing {
    margin-inline-end: 6px;
    padding: 0 6px;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-primary-color, #fff);
    background: var(--error-color);
  }
  .back {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin-inline-start: -8px;
    border-radius: 50%;
  }
  .back:hover {
    background: var(--secondary-background-color);
  }
  .back svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
  }
  .sort {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 0 16px 8px;
    font-size: 0.85rem;
    color: var(--secondary-text-color);
  }
  .sort button {
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid var(--divider-color);
    border-radius: 16px;
    color: var(--primary-text-color);
  }
  .sort button[aria-pressed="true"] {
    border-color: var(--primary-color);
    color: var(--text-primary-color, #fff);
    background: var(--primary-color);
  }
  .message {
    margin: 0;
    padding: 8px 16px 24px;
    color: var(--secondary-text-color);
  }
  .error {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    color: var(--error-color);
  }
  .config-error {
    padding: 16px;
  }
  .retry {
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid currentColor;
    border-radius: 16px;
    color: var(--primary-color);
  }
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`;var ct=[["due","Due date"],["points","Points"],["name","Name"]],lt="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z",U=class extends g{constructor(){super();this._remembered=new Map;this._request=0;this._sort="due",this._error=!1}static getConfigElement(){return document.createElement(re)}static getStubConfig(t){var i;let s=Object.values((i=t==null?void 0:t.devices)!=null?i:{}).find(r=>{var o;return(o=r.identifiers)==null?void 0:o.some(([c])=>c===S)});return s?{device_id:s.id}:{}}setConfig(t){var s;if(!t||typeof t!="object")throw new Error("Invalid configuration");t.device_id!==((s=this._config)==null?void 0:s.device_id)&&(this._close(),this._remembered.clear()),this._config=t}getCardSize(){return Math.max(2,1+this._rows().length)}get _device(){var s,i,r;let t=(s=this._config)==null?void 0:s.device_id;return t?(r=(i=this.hass)==null?void 0:i.devices)==null?void 0:r[t]:void 0}_rows(){var s;let t=(s=this._config)==null?void 0:s.device_id;return!this.hass||!t?[]:De(this.hass,t,this._remembered)}willUpdate(t){if(!t.has("hass")||!this._open||!this.hass)return;let s=this.hass.states[this._open];s?s!==this._loadedFor&&this._load():this._close()}render(){if(!this._config||!this.hass)return p;if(!this._config.device_id)return this._configError("Choose a student in the card's settings.");let t=this._device;if(!t)return this._configError("The student this card was set up for no longer exists. Choose a student in the card's settings.");let s=this._rows(),i=this._open&&s.find(r=>r.entityId===this._open);return u`<ha-card>
      ${i?this._renderClass(i):this._renderList(s,t)}
    </ha-card>`}_configError(t){return u`<ha-card>
      <p class="message error config-error" role="alert">${t}</p>
    </ha-card>`}_renderList(t,s){var r;let i=((r=this._config)==null?void 0:r.title)||Me(s);return u`
      ${i?u`<div class="header"><h2 class="title">${i}</h2></div>`:p}
      ${t.length===0?u`<p class="message empty">No active classes</p>`:u`<ul class="courses">
            ${t.map(o=>u`<li>
                  <button
                    class="row course"
                    type="button"
                    @click=${()=>this._openClass(o.entityId)}
                  >
                    <span class="text">
                      <span class="primary name">${o.name}</span>
                      <span class="secondary teachers"
                        >${o.teachers.join(", ")}</span
                      >
                    </span>
                    <span class="grade">${oe(o.state)}</span>
                  </button>
                </li>`)}
          </ul>`}
    `}_renderClass(t){return u`
      <div class="header">
        <button
          class="back"
          type="button"
          aria-label="Back to classes"
          title="Back to classes"
          @click=${this._back}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${lt}></path></svg>
        </button>
        <h2 class="title">${t.name}</h2>
        <span class="grade">${oe(t.state)}</span>
      </div>
      <div class="sort" role="group" aria-label="Sort assignments">
        <span aria-hidden="true">Sort by</span>
        ${ct.map(([s,i])=>u`<button
              type="button"
              data-sort=${s}
              aria-pressed=${this._sort===s?"true":"false"}
              @click=${()=>{this._sort=s}}
            >
              ${i}
            </button>`)}
      </div>
      ${this._renderAssignments()}
    `}_renderAssignments(){var s,i;if(this._error)return u`<p class="message error" role="alert">
        <span>Could not load this class's assignments.</span>
        <button class="retry" type="button" @click=${()=>this._load()}>
          Try again
        </button>
      </p>`;if(this._assignments===void 0)return u`<p class="message loading">Loading…</p>`;if(this._assignments.length===0)return u`<p class="message empty">Nothing to turn in</p>`;let t=qe(this._assignments,this._sort,((i=(s=this.hass)==null?void 0:s.locale)==null?void 0:i.language)||void 0);return u`<ul class="assignments">
      ${t.map(r=>{var l;let o=Le(r.due_at,this.hass),c=ze(r.points_possible,this.hass),a=u`
          <span class="text">
            <span class="primary name">${(l=r.name)!=null?l:"Untitled assignment"}</span>
            <span class="secondary"
              >${r.missing?u`<span class="missing">Missing</span>`:p}<span class="due">${o?`Due ${o}`:""}</span></span
            >
          </span>
          ${c?u`<span class="points">${c}</span>`:p}
        `;return u`<li>
          ${r.html_url?u`<a
                class="row assignment"
                href=${r.html_url}
                target="_blank"
                rel="noopener noreferrer"
                >${a}</a
              >`:u`<div class="row assignment">${a}</div>`}
        </li>`})}
    </ul>`}_openClass(t){this._open=t,this._load()}_back(){this._close()}_close(){this._request+=1,this._open=void 0,this._assignments=void 0,this._error=!1,this._loadedFor=void 0}async _load(){var a;let t=this.hass,s=this._open;if(!t||!s)return;let i=++this._request;this._loadedFor=t.states[s],this._error=!1;let r=this._remembered.get(s),o=this._device,c=o&&ke(o);try{if(!c||(r==null?void 0:r.courseId)===void 0||r.studentId===void 0)throw new Error("The class's details are not available");let l=await t.callService(S,Oe,{config_entry_id:c},void 0,!1,!0);if(i!==this._request)return;let d=(a=l==null?void 0:l.response)==null?void 0:a.assignments;if(!Array.isArray(d))throw new Error("Unexpected response");this._assignments=d.filter(h=>h.student_id===r.studentId&&h.course_id===r.courseId)}catch{if(i!==this._request)return;this._assignments=void 0,this._error=!0}}};U.styles=Fe,U.properties={hass:{attribute:!1},_config:{state:!0},_open:{state:!0},_sort:{state:!0},_assignments:{state:!0},_error:{state:!0}};B(j,U);var Ve;window.customCards=(Ve=window.customCards)!=null?Ve:[];window.customCards.some(n=>n.type===j)||window.customCards.push({type:j,name:"Canvas LMS courses",description:"A student's classes with teacher and current grade; open a class to see what has not been turned in.",documentationURL:"https://github.com/ivlo11/canvas-lms-homeassistant/blob/main/docs/courses-card.md"});export{U as CanvasLmsCoursesCard};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
