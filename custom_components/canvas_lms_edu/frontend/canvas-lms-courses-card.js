var L=globalThis,z=L.ShadowRoot&&(L.ShadyCSS===void 0||L.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,V=Symbol(),ot=new WeakMap,P=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==V)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(z&&t===void 0){let s=e!==void 0&&e.length===1;s&&(t=ot.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&ot.set(e,t))}return t}toString(){return this.cssText}},at=n=>new P(typeof n=="string"?n:n+"",void 0,V),F=(n,...t)=>{let e=n.length===1?n[0]:t.reduce((s,i,r)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+n[r+1],n[0]);return new P(e,n,V)},ct=(n,t)=>{if(z)n.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let s=document.createElement("style"),i=L.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=e.cssText,n.appendChild(s)}},W=z?n=>n:n=>n instanceof CSSStyleSheet?(t=>{let e="";for(let s of t.cssRules)e+=s.cssText;return at(e)})(n):n;var{is:Ft,defineProperty:Wt,getOwnPropertyDescriptor:Kt,getOwnPropertyNames:Yt,getOwnPropertySymbols:Zt,getPrototypeOf:Jt}=Object,y=globalThis,lt=y.trustedTypes,Gt=lt?lt.emptyScript:"",K=y.reactiveElementPolyfillSupport,N=(n,t)=>n,Y={toAttribute(n,t){switch(t){case Boolean:n=n?Gt:null;break;case Object:case Array:n=n==null?n:JSON.stringify(n)}return n},fromAttribute(n,t){let e=n;switch(t){case Boolean:e=n!==null;break;case Number:e=n===null?null:Number(n);break;case Object:case Array:try{e=JSON.parse(n)}catch{e=null}}return e}},mt=(n,t)=>!Ft(n,t),dt={attribute:!0,type:String,converter:Y,reflect:!1,useDefault:!1,hasChanged:mt},ht,pt;(ht=Symbol.metadata)!=null||(Symbol.metadata=Symbol("metadata")),(pt=y.litPropertyMetadata)!=null||(y.litPropertyMetadata=new WeakMap);var _=class extends HTMLElement{static addInitializer(t){var e;this._$Ei(),((e=this.l)!=null?e:this.l=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=dt){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let s=Symbol(),i=this.getPropertyDescriptor(t,s,e);i!==void 0&&Wt(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){var o;let{get:i,set:r}=(o=Kt(this.prototype,t))!=null?o:{get(){return this[e]},set(c){this[e]=c}};return{get:i,set(c){let a=i==null?void 0:i.call(this);r==null||r.call(this,c),this.requestUpdate(t,a,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){var e;return(e=this.elementProperties.get(t))!=null?e:dt}static _$Ei(){if(this.hasOwnProperty(N("elementProperties")))return;let t=Jt(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(N("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(N("properties"))){let e=this.properties,s=[...Yt(e),...Zt(e)];for(let i of s)this.createProperty(i,e[i])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[s,i]of e)this.elementProperties.set(s,i)}this._$Eh=new Map;for(let[e,s]of this.elementProperties){let i=this._$Eu(e,s);i!==void 0&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let s=new Set(t.flat(1/0).reverse());for(let i of s)e.unshift(W(i))}else t!==void 0&&e.push(W(t));return e}static _$Eu(t,e){let s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var t;this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),(t=this.constructor.l)==null||t.forEach(e=>e(this))}addController(t){var e,s;((e=this._$EO)!=null?e:this._$EO=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&((s=t.hostConnected)==null||s.call(t))}removeController(t){var e;(e=this._$EO)==null||e.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){var e;let t=(e=this.shadowRoot)!=null?e:this.attachShadow(this.constructor.shadowRootOptions);return ct(t,this.constructor.elementStyles),t}connectedCallback(){var t,e;(t=this.renderRoot)!=null||(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$EO)==null||e.forEach(s=>{var i;return(i=s.hostConnected)==null?void 0:i.call(s)})}enableUpdating(t){}disconnectedCallback(){var t;(t=this._$EO)==null||t.forEach(e=>{var s;return(s=e.hostDisconnected)==null?void 0:s.call(e)})}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){var r;let s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(i!==void 0&&s.reflect===!0){let o=(((r=s.converter)==null?void 0:r.toAttribute)!==void 0?s.converter:Y).toAttribute(e,s.type);this._$Em=t,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(t,e){var r,o,c;let s=this.constructor,i=s._$Eh.get(t);if(i!==void 0&&this._$Em!==i){let a=s.getPropertyOptions(i),l=typeof a.converter=="function"?{fromAttribute:a.converter}:((r=a.converter)==null?void 0:r.fromAttribute)!==void 0?a.converter:Y;this._$Em=i;let d=l.fromAttribute(e,a.type);this[i]=(c=d!=null?d:(o=this._$Ej)==null?void 0:o.get(i))!=null?c:d,this._$Em=null}}requestUpdate(t,e,s,i=!1,r){var o,c;if(t!==void 0){let a=this.constructor;if(i===!1&&(r=this[t]),s!=null||(s=a.getPropertyOptions(t)),!(((o=s.hasChanged)!=null?o:mt)(r,e)||s.useDefault&&s.reflect&&r===((c=this._$Ej)==null?void 0:c.get(t))&&!this.hasAttribute(a._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:r},o){var c,a,l;s&&!((c=this._$Ej)!=null?c:this._$Ej=new Map).has(t)&&(this._$Ej.set(t,(a=o!=null?o:e)!=null?a:this[t]),r!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),i===!0&&this._$Em!==t&&((l=this._$Eq)!=null?l:this._$Eq=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var s,i;if(!this.isUpdatePending)return;if(!this.hasUpdated){if((s=this.renderRoot)!=null||(this.renderRoot=this.createRenderRoot()),this._$Ep){for(let[o,c]of this._$Ep)this[o]=c;this._$Ep=void 0}let r=this.constructor.elementProperties;if(r.size>0)for(let[o,c]of r){let{wrapped:a}=c,l=this[o];a!==!0||this._$AL.has(o)||l===void 0||this.C(o,void 0,c,l)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),(i=this._$EO)==null||i.forEach(r=>{var o;return(o=r.hostUpdate)==null?void 0:o.call(r)}),this.update(e)):this._$EM()}catch(r){throw t=!1,this._$EM(),r}t&&this._$AE(e)}willUpdate(t){}_$AE(t){var e;(e=this._$EO)==null||e.forEach(s=>{var i;return(i=s.hostUpdated)==null?void 0:i.call(s)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&(this._$Eq=this._$Eq.forEach(e=>this._$ET(e,this[e]))),this._$EM()}updated(t){}firstUpdated(t){}},ut;_.elementStyles=[],_.shadowRootOptions={mode:"open"},_[N("elementProperties")]=new Map,_[N("finalized")]=new Map,K==null||K({ReactiveElement:_}),((ut=y.reactiveElementVersions)!=null?ut:y.reactiveElementVersions=[]).push("2.1.2");var H=globalThis,gt=n=>n,j=H.trustedTypes,ft=j?j.createPolicy("lit-html",{createHTML:n=>n}):void 0,xt="$lit$",$=`lit$${Math.random().toFixed(9).slice(2)}$`,Et="?"+$,Qt=`<${Et}>`,x=document,O=()=>x.createComment(""),k=n=>n===null||typeof n!="object"&&typeof n!="function",st=Array.isArray,Xt=n=>st(n)||typeof(n==null?void 0:n[Symbol.iterator])=="function",Z=`[ 	
\f\r]`,T=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,_t=/-->/g,yt=/>/g,A=RegExp(`>|${Z}(?:([^\\s"'>=/]+)(${Z}*=${Z}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),$t=/'/g,vt=/"/g,wt=/^(?:script|style|textarea|title)$/i,it=n=>(t,...e)=>({_$litType$:n,strings:t,values:e}),u=it(1),pe=it(2),ue=it(3),E=Symbol.for("lit-noChange"),p=Symbol.for("lit-nothing"),At=new WeakMap,b=x.createTreeWalker(x,129);function St(n,t){if(!st(n)||!n.hasOwnProperty("raw"))throw Error("invalid template strings array");return ft!==void 0?ft.createHTML(t):t}var te=(n,t)=>{let e=n.length-1,s=[],i,r=t===2?"<svg>":t===3?"<math>":"",o=T;for(let c=0;c<e;c++){let a=n[c],l,d,h=-1,m=0;for(;m<a.length&&(o.lastIndex=m,d=o.exec(a),d!==null);)m=o.lastIndex,o===T?d[1]==="!--"?o=_t:d[1]!==void 0?o=yt:d[2]!==void 0?(wt.test(d[2])&&(i=RegExp("</"+d[2],"g")),o=A):d[3]!==void 0&&(o=A):o===A?d[0]===">"?(o=i!=null?i:T,h=-1):d[1]===void 0?h=-2:(h=o.lastIndex-d[2].length,l=d[1],o=d[3]===void 0?A:d[3]==='"'?vt:$t):o===vt||o===$t?o=A:o===_t||o===yt?o=T:(o=A,i=void 0);let g=o===A&&n[c+1].startsWith("/>")?" ":"";r+=o===T?a+Qt:h>=0?(s.push(l),a.slice(0,h)+xt+a.slice(h)+$+g):a+$+(h===-2?c:g)}return[St(n,r+(n[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]},U=class n{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let r=0,o=0,c=t.length-1,a=this.parts,[l,d]=te(t,e);if(this.el=n.createElement(l,s),b.currentNode=this.el.content,e===2||e===3){let h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(i=b.nextNode())!==null&&a.length<c;){if(i.nodeType===1){if(i.hasAttributes())for(let h of i.getAttributeNames())if(h.endsWith(xt)){let m=d[o++],g=i.getAttribute(h).split($),v=/([.?@])?(.*)/.exec(m);a.push({type:1,index:r,name:v[2],strings:g,ctor:v[1]==="."?Q:v[1]==="?"?X:v[1]==="@"?tt:R}),i.removeAttribute(h)}else h.startsWith($)&&(a.push({type:6,index:r}),i.removeAttribute(h));if(wt.test(i.tagName)){let h=i.textContent.split($),m=h.length-1;if(m>0){i.textContent=j?j.emptyScript:"";for(let g=0;g<m;g++)i.append(h[g],O()),b.nextNode(),a.push({type:2,index:++r});i.append(h[m],O())}}}else if(i.nodeType===8)if(i.data===Et)a.push({type:2,index:r});else{let h=-1;for(;(h=i.data.indexOf($,h+1))!==-1;)a.push({type:7,index:r}),h+=$.length-1}r++}}static createElement(t,e){let s=x.createElement("template");return s.innerHTML=t,s}};function C(n,t,e=n,s){var o,c,a;if(t===E)return t;let i=s!==void 0?(o=e._$Co)==null?void 0:o[s]:e._$Cl,r=k(t)?void 0:t._$litDirective$;return(i==null?void 0:i.constructor)!==r&&((c=i==null?void 0:i._$AO)==null||c.call(i,!1),r===void 0?i=void 0:(i=new r(n),i._$AT(n,e,s)),s!==void 0?((a=e._$Co)!=null?a:e._$Co=[])[s]=i:e._$Cl=i),i!==void 0&&(t=C(n,i._$AS(n,t.values),i,s)),t}var G=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){var l;let{el:{content:e},parts:s}=this._$AD,i=((l=t==null?void 0:t.creationScope)!=null?l:x).importNode(e,!0);b.currentNode=i;let r=b.nextNode(),o=0,c=0,a=s[0];for(;a!==void 0;){if(o===a.index){let d;a.type===2?d=new D(r,r.nextSibling,this,t):a.type===1?d=new a.ctor(r,a.name,a.strings,this,t):a.type===6&&(d=new et(r,this,t)),this._$AV.push(d),a=s[++c]}o!==(a==null?void 0:a.index)&&(r=b.nextNode(),o++)}return b.currentNode=x,i}p(t){let e=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}},D=class n{get _$AU(){var t,e;return(e=(t=this._$AM)==null?void 0:t._$AU)!=null?e:this._$Cv}constructor(t,e,s,i){var r;this.type=2,this._$AH=p,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=(r=i==null?void 0:i.isConnected)!=null?r:!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&(t==null?void 0:t.nodeType)===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=C(this,t,e),k(t)?t===p||t==null||t===""?(this._$AH!==p&&this._$AR(),this._$AH=p):t!==this._$AH&&t!==E&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):Xt(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==p&&k(this._$AH)?this._$AA.nextSibling.data=t:this.T(x.createTextNode(t)),this._$AH=t}$(t){var r;let{values:e,_$litType$:s}=t,i=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=U.createElement(St(s.h,s.h[0]),this.options)),s);if(((r=this._$AH)==null?void 0:r._$AD)===i)this._$AH.p(e);else{let o=new G(i,this),c=o.u(this.options);o.p(e),this.T(c),this._$AH=o}}_$AC(t){let e=At.get(t.strings);return e===void 0&&At.set(t.strings,e=new U(t)),e}k(t){st(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,s,i=0;for(let r of t)i===e.length?e.push(s=new n(this.O(O()),this.O(O()),this,this.options)):s=e[i],s._$AI(r),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){var s;for((s=this._$AP)==null?void 0:s.call(this,!1,!0,e);t!==this._$AB;){let i=gt(t).nextSibling;gt(t).remove(),t=i}}setConnected(t){var e;this._$AM===void 0&&(this._$Cv=t,(e=this._$AP)==null||e.call(this,t))}},R=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,r){this.type=1,this._$AH=p,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=r,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=p}_$AI(t,e=this,s,i){let r=this.strings,o=!1;if(r===void 0)t=C(this,t,e,0),o=!k(t)||t!==this._$AH&&t!==E,o&&(this._$AH=t);else{let c=t,a,l;for(t=r[0],a=0;a<r.length-1;a++)l=C(this,c[s+a],e,a),l===E&&(l=this._$AH[a]),o||(o=!k(l)||l!==this._$AH[a]),l===p?t=p:t!==p&&(t+=(l!=null?l:"")+r[a+1]),this._$AH[a]=l}o&&!i&&this.j(t)}j(t){t===p?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t!=null?t:"")}},Q=class extends R{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===p?void 0:t}},X=class extends R{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==p)}},tt=class extends R{constructor(t,e,s,i,r){super(t,e,s,i,r),this.type=5}_$AI(t,e=this){var o;if((t=(o=C(this,t,e,0))!=null?o:p)===E)return;let s=this._$AH,i=t===p&&s!==p||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,r=t!==p&&(s===p||i);i&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){var e,s;typeof this._$AH=="function"?this._$AH.call((s=(e=this.options)==null?void 0:e.host)!=null?s:this.element,t):this._$AH.handleEvent(t)}},et=class{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){C(this,t)}};var J=H.litHtmlPolyfillSupport,bt;J==null||J(U,D),((bt=H.litHtmlVersions)!=null?bt:H.litHtmlVersions=[]).push("3.3.3");var Ct=(n,t,e)=>{var r,o;let s=(r=e==null?void 0:e.renderBefore)!=null?r:t,i=s._$litPart$;if(i===void 0){let c=(o=e==null?void 0:e.renderBefore)!=null?o:null;s._$litPart$=i=new D(t.insertBefore(O(),c),c,void 0,e!=null?e:{})}return i._$AI(n),i};var w=globalThis,f=class extends _{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var e,s;let t=super.createRenderRoot();return(s=(e=this.renderOptions).renderBefore)!=null||(e.renderBefore=t.firstChild),t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=Ct(e,this.renderRoot,this.renderOptions)}connectedCallback(){var t;super.connectedCallback(),(t=this._$Do)==null||t.setConnected(!0)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this._$Do)==null||t.setConnected(!1)}render(){return E}},Rt;f._$litElement$=!0,f.finalized=!0,(Rt=w.litElementHydrateSupport)==null||Rt.call(w,{LitElement:f});var nt=w.litElementPolyfillSupport;nt==null||nt({LitElement:f});var Pt;((Pt=w.litElementVersions)!=null?Pt:w.litElementVersions=[]).push("4.2.2");var S="canvas_lms_edu",Nt="course_grade",Tt="get_unsubmitted_assignments",M="canvas-lms-courses-card";var Ht=n=>typeof n=="number"?n:void 0;function Ot(n){var t,e,s,i;return(i=(s=(t=n.primary_config_entry)!=null?t:n.config_entry_id)!=null?s:(e=n.config_entries)==null?void 0:e[0])!=null?i:void 0}function kt(n){return n.name_by_user||n.name||""}function ee(n,t){if(typeof n!="string")return"";let e=n;for(let s of[t==null?void 0:t.name_by_user,t==null?void 0:t.name])if(s&&e.startsWith(`${s} `)){e=e.slice(s.length+1);break}return e.replace(/ grade$/,"")}function Ut(n,t,e=new Map){var r,o,c,a;let s=[];for(let l of Object.values(n.entities)){if(l.platform!==S||l.device_id!==t||l.translation_key!==Nt)continue;let d=n.states[l.entity_id];if(!d)continue;let h=d.attributes,m=e.get(l.entity_id),g=h.teachers,v={entityId:l.entity_id,name:typeof h.course_name=="string"&&h.course_name||(m==null?void 0:m.name)||ee(h.friendly_name,n.devices[t])||l.entity_id,teachers:Array.isArray(g)?g.filter(Vt=>typeof Vt=="string"):(r=m==null?void 0:m.teachers)!=null?r:[],state:d.state,courseId:(o=Ht(h.course_id))!=null?o:m==null?void 0:m.courseId,studentId:(c=Ht(h.student_id))!=null?c:m==null?void 0:m.studentId};e.set(l.entity_id,v),s.push(v)}let i=((a=n.locale)==null?void 0:a.language)||void 0;return s.sort((l,d)=>l.name.localeCompare(d.name,i,{sensitivity:"base"})||l.entityId.localeCompare(d.entityId))}var q="canvas-lms-courses-card-editor",se=[{name:"device_id",required:!0,selector:{device:{filter:{integration:S}}}},{name:"title",selector:{text:{}}}],ie={device_id:"Student",title:"Title (optional)"},B=class extends f{setConfig(t){this._config=t}render(){return this._config?u`<ha-form
      .hass=${this.hass}
      .data=${this._config}
      .schema=${se}
      .computeLabel=${t=>{var e;return(e=ie[t.name])!=null?e:t.name}}
      @value-changed=${this._changed}
    ></ha-form>`:u``}_changed(t){t.stopPropagation();let e={...this._config,...t.detail.value};e.title||delete e.title,this._config=e,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:e},bubbles:!0,composed:!0}))}};B.properties={hass:{attribute:!1},_config:{state:!0}};customElements.get(q)||customElements.define(q,B);function rt(n){if(n===void 0||n.trim()==="")return"\u2014";let t=Number(n);return Number.isFinite(t)?`${t}%`:"\u2014"}var Dt=n=>{var t;return((t=n==null?void 0:n.locale)==null?void 0:t.language)||void 0};function Mt(n,t){var r,o;if(!n)return"";let e=new Date(n);if(Number.isNaN(e.getTime()))return"";let s=((r=t==null?void 0:t.locale)==null?void 0:r.time_zone)==="server"?(o=t.config)==null?void 0:o.time_zone:void 0,i=c=>new Intl.DateTimeFormat(Dt(t),{dateStyle:"medium",timeStyle:"short",timeZone:c}).format(e);try{return i(s)}catch{return i(void 0)}}function It(n,t){return n==null?"":`${new Intl.NumberFormat(Dt(t),{maximumFractionDigits:2}).format(n)} ${n===1?"pt":"pts"}`}var Lt=n=>{if(!n.due_at)return null;let t=Date.parse(n.due_at);return Number.isNaN(t)?null:t},zt=(n,t)=>{let[e,s]=[Lt(n),Lt(t)];return e===s?0:e===null?1:s===null?-1:e-s},ne=(n,t)=>{let[e,s]=[n.points_possible,t.points_possible];return e===s?0:e==null?1:s==null?-1:s-e},re=n=>(t,e)=>{var s,i;return((s=t.name)!=null?s:"").localeCompare((i=e.name)!=null?i:"",n,{sensitivity:"base"})};function jt(n,t,e){let s=re(e),i=t==="points"?ne:t==="name"?s:zt;return[...n].sort((r,o)=>i(r,o)||zt(r,o)||s(r,o)||r.assignment_id-o.assignment_id)}var Bt=F`
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
`;var oe=[["due","Due date"],["points","Points"],["name","Name"]],ae="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z",I=class extends f{constructor(){super();this._remembered=new Map;this._request=0;this._sort="due",this._error=!1}static getConfigElement(){return document.createElement(q)}static getStubConfig(e){var i;let s=Object.values((i=e==null?void 0:e.devices)!=null?i:{}).find(r=>{var o;return(o=r.identifiers)==null?void 0:o.some(([c])=>c===S)});return s?{device_id:s.id}:{}}setConfig(e){var s;if(!e||typeof e!="object")throw new Error("Invalid configuration");e.device_id!==((s=this._config)==null?void 0:s.device_id)&&(this._close(),this._remembered.clear()),this._config=e}getCardSize(){return Math.max(2,1+this._rows().length)}get _device(){var s,i,r;let e=(s=this._config)==null?void 0:s.device_id;return e?(r=(i=this.hass)==null?void 0:i.devices)==null?void 0:r[e]:void 0}_rows(){var s;let e=(s=this._config)==null?void 0:s.device_id;return!this.hass||!e?[]:Ut(this.hass,e,this._remembered)}willUpdate(e){if(!e.has("hass")||!this._open||!this.hass)return;let s=this.hass.states[this._open];s?s!==this._loadedFor&&this._load():this._close()}render(){if(!this._config||!this.hass)return p;if(!this._config.device_id)return this._configError("Choose a student in the card's settings.");let e=this._device;if(!e)return this._configError("The student this card was set up for no longer exists. Choose a student in the card's settings.");let s=this._rows(),i=this._open&&s.find(r=>r.entityId===this._open);return u`<ha-card>
      ${i?this._renderClass(i):this._renderList(s,e)}
    </ha-card>`}_configError(e){return u`<ha-card>
      <p class="message error config-error" role="alert">${e}</p>
    </ha-card>`}_renderList(e,s){var r;let i=((r=this._config)==null?void 0:r.title)||kt(s);return u`
      ${i?u`<div class="header"><h2 class="title">${i}</h2></div>`:p}
      ${e.length===0?u`<p class="message empty">No active classes</p>`:u`<ul class="courses">
            ${e.map(o=>u`<li>
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
                    <span class="grade">${rt(o.state)}</span>
                  </button>
                </li>`)}
          </ul>`}
    `}_renderClass(e){return u`
      <div class="header">
        <button
          class="back"
          type="button"
          aria-label="Back to classes"
          title="Back to classes"
          @click=${this._back}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${ae}></path></svg>
        </button>
        <h2 class="title">${e.name}</h2>
        <span class="grade">${rt(e.state)}</span>
      </div>
      <div class="sort" role="group" aria-label="Sort assignments">
        <span aria-hidden="true">Sort by</span>
        ${oe.map(([s,i])=>u`<button
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
      </p>`;if(this._assignments===void 0)return u`<p class="message loading">Loading…</p>`;if(this._assignments.length===0)return u`<p class="message empty">Nothing to turn in</p>`;let e=jt(this._assignments,this._sort,((i=(s=this.hass)==null?void 0:s.locale)==null?void 0:i.language)||void 0);return u`<ul class="assignments">
      ${e.map(r=>{var l;let o=Mt(r.due_at,this.hass),c=It(r.points_possible,this.hass),a=u`
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
    </ul>`}_openClass(e){this._open=e,this._load()}_back(){this._close()}_close(){this._request+=1,this._open=void 0,this._assignments=void 0,this._error=!1,this._loadedFor=void 0}async _load(){var a;let e=this.hass,s=this._open;if(!e||!s)return;let i=++this._request;this._loadedFor=e.states[s],this._error=!1;let r=this._remembered.get(s),o=this._device,c=o&&Ot(o);try{if(!c||(r==null?void 0:r.courseId)===void 0||r.studentId===void 0)throw new Error("The class's details are not available");let l=await e.callService(S,Tt,{config_entry_id:c},void 0,!1,!0);if(i!==this._request)return;let d=(a=l==null?void 0:l.response)==null?void 0:a.assignments;if(!Array.isArray(d))throw new Error("Unexpected response");this._assignments=d.filter(h=>h.student_id===r.studentId&&h.course_id===r.courseId)}catch{if(i!==this._request)return;this._assignments=void 0,this._error=!0}}};I.styles=Bt,I.properties={hass:{attribute:!1},_config:{state:!0},_open:{state:!0},_sort:{state:!0},_assignments:{state:!0},_error:{state:!0}};customElements.get(M)||customElements.define(M,I);var qt;window.customCards=(qt=window.customCards)!=null?qt:[];window.customCards.some(n=>n.type===M)||window.customCards.push({type:M,name:"Canvas LMS courses",description:"A student's classes with teacher and current grade; open a class to see what has not been turned in.",documentationURL:"https://github.com/ivlo11/canvas-lms-homeassistant/blob/main/docs/courses-card.md"});export{I as CanvasLmsCoursesCard};
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
