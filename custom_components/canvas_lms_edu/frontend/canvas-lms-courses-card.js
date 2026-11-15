var U=globalThis,D=U.ShadowRoot&&(U.ShadyCSS===void 0||U.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,z=Symbol(),it=new WeakMap,S=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==z)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(D&&t===void 0){let s=e!==void 0&&e.length===1;s&&(t=it.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&it.set(e,t))}return t}toString(){return this.cssText}},nt=i=>new S(typeof i=="string"?i:i+"",void 0,z),j=(i,...t)=>{let e=i.length===1?i[0]:t.reduce((s,n,r)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(n)+i[r+1],i[0]);return new S(e,i,z)},rt=(i,t)=>{if(D)i.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let s=document.createElement("style"),n=U.litNonce;n!==void 0&&s.setAttribute("nonce",n),s.textContent=e.cssText,i.appendChild(s)}},B=D?i=>i:i=>i instanceof CSSStyleSheet?(t=>{let e="";for(let s of t.cssRules)e+=s.cssText;return nt(e)})(i):i;var{is:kt,defineProperty:Ut,getOwnPropertyDescriptor:Dt,getOwnPropertyNames:Mt,getOwnPropertySymbols:It,getPrototypeOf:Lt}=Object,M=globalThis,ot=M.trustedTypes,zt=ot?ot.emptyScript:"",jt=M.reactiveElementPolyfillSupport,C=(i,t)=>i,q={toAttribute(i,t){switch(t){case Boolean:i=i?zt:null;break;case Object:case Array:i=i==null?i:JSON.stringify(i)}return i},fromAttribute(i,t){let e=i;switch(t){case Boolean:e=i!==null;break;case Number:e=i===null?null:Number(i);break;case Object:case Array:try{e=JSON.parse(i)}catch{e=null}}return e}},ct=(i,t)=>!kt(i,t),at={attribute:!0,type:String,converter:q,reflect:!1,useDefault:!1,hasChanged:ct};Symbol.metadata??=Symbol("metadata"),M.litPropertyMetadata??=new WeakMap;var f=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=at){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let s=Symbol(),n=this.getPropertyDescriptor(t,s,e);n!==void 0&&Ut(this.prototype,t,n)}}static getPropertyDescriptor(t,e,s){let{get:n,set:r}=Dt(this.prototype,t)??{get(){return this[e]},set(o){this[e]=o}};return{get:n,set(o){let c=n?.call(this);r?.call(this,o),this.requestUpdate(t,c,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??at}static _$Ei(){if(this.hasOwnProperty(C("elementProperties")))return;let t=Lt(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(C("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(C("properties"))){let e=this.properties,s=[...Mt(e),...It(e)];for(let n of s)this.createProperty(n,e[n])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[s,n]of e)this.elementProperties.set(s,n)}this._$Eh=new Map;for(let[e,s]of this.elementProperties){let n=this._$Eu(e,s);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let s=new Set(t.flat(1/0).reverse());for(let n of s)e.unshift(B(n))}else t!==void 0&&e.push(B(t));return e}static _$Eu(t,e){let s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return rt(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){let s=this.constructor.elementProperties.get(t),n=this.constructor._$Eu(t,s);if(n!==void 0&&s.reflect===!0){let r=(s.converter?.toAttribute!==void 0?s.converter:q).toAttribute(e,s.type);this._$Em=t,r==null?this.removeAttribute(n):this.setAttribute(n,r),this._$Em=null}}_$AK(t,e){let s=this.constructor,n=s._$Eh.get(t);if(n!==void 0&&this._$Em!==n){let r=s.getPropertyOptions(n),o=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:q;this._$Em=n;let c=o.fromAttribute(e,r.type);this[n]=c??this._$Ej?.get(n)??c,this._$Em=null}}requestUpdate(t,e,s,n=!1,r){if(t!==void 0){let o=this.constructor;if(n===!1&&(r=this[t]),s??=o.getPropertyOptions(t),!((s.hasChanged??ct)(r,e)||s.useDefault&&s.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:n,wrapped:r},o){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),r!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),n===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[n,r]of this._$Ep)this[n]=r;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[n,r]of s){let{wrapped:o}=r,c=this[n];o!==!0||this._$AL.has(n)||c===void 0||this.C(n,void 0,r,c)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(e)):this._$EM()}catch(s){throw t=!1,this._$EM(),s}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};f.elementStyles=[],f.shadowRootOptions={mode:"open"},f[C("elementProperties")]=new Map,f[C("finalized")]=new Map,jt?.({ReactiveElement:f}),(M.reactiveElementVersions??=[]).push("2.1.2");var J=globalThis,lt=i=>i,I=J.trustedTypes,dt=I?I.createPolicy("lit-html",{createHTML:i=>i}):void 0,ft="$lit$",y=`lit$${Math.random().toFixed(9).slice(2)}$`,_t="?"+y,Bt=`<${_t}>`,A=document,P=()=>A.createComment(""),N=i=>i===null||typeof i!="object"&&typeof i!="function",G=Array.isArray,qt=i=>G(i)||typeof i?.[Symbol.iterator]=="function",V=`[ 	
\f\r]`,R=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ht=/-->/g,pt=/>/g,$=RegExp(`>|${V}(?:([^\\s"'>=/]+)(${V}*=${V}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),ut=/'/g,mt=/"/g,yt=/^(?:script|style|textarea|title)$/i,Q=i=>(t,...e)=>({_$litType$:i,strings:t,values:e}),p=Q(1),ne=Q(2),re=Q(3),b=Symbol.for("lit-noChange"),h=Symbol.for("lit-nothing"),gt=new WeakMap,v=A.createTreeWalker(A,129);function $t(i,t){if(!G(i)||!i.hasOwnProperty("raw"))throw Error("invalid template strings array");return dt!==void 0?dt.createHTML(t):t}var Vt=(i,t)=>{let e=i.length-1,s=[],n,r=t===2?"<svg>":t===3?"<math>":"",o=R;for(let c=0;c<e;c++){let a=i[c],d,u,l=-1,g=0;for(;g<a.length&&(o.lastIndex=g,u=o.exec(a),u!==null);)g=o.lastIndex,o===R?u[1]==="!--"?o=ht:u[1]!==void 0?o=pt:u[2]!==void 0?(yt.test(u[2])&&(n=RegExp("</"+u[2],"g")),o=$):u[3]!==void 0&&(o=$):o===$?u[0]===">"?(o=n??R,l=-1):u[1]===void 0?l=-2:(l=o.lastIndex-u[2].length,d=u[1],o=u[3]===void 0?$:u[3]==='"'?mt:ut):o===mt||o===ut?o=$:o===ht||o===pt?o=R:(o=$,n=void 0);let _=o===$&&i[c+1].startsWith("/>")?" ":"";r+=o===R?a+Bt:l>=0?(s.push(d),a.slice(0,l)+ft+a.slice(l)+y+_):a+y+(l===-2?c:_)}return[$t(i,r+(i[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]},T=class i{constructor({strings:t,_$litType$:e},s){let n;this.parts=[];let r=0,o=0,c=t.length-1,a=this.parts,[d,u]=Vt(t,e);if(this.el=i.createElement(d,s),v.currentNode=this.el.content,e===2||e===3){let l=this.el.content.firstChild;l.replaceWith(...l.childNodes)}for(;(n=v.nextNode())!==null&&a.length<c;){if(n.nodeType===1){if(n.hasAttributes())for(let l of n.getAttributeNames())if(l.endsWith(ft)){let g=u[o++],_=n.getAttribute(l).split(y),k=/([.?@])?(.*)/.exec(g);a.push({type:1,index:r,name:k[2],strings:_,ctor:k[1]==="."?W:k[1]==="?"?K:k[1]==="@"?Y:w}),n.removeAttribute(l)}else l.startsWith(y)&&(a.push({type:6,index:r}),n.removeAttribute(l));if(yt.test(n.tagName)){let l=n.textContent.split(y),g=l.length-1;if(g>0){n.textContent=I?I.emptyScript:"";for(let _=0;_<g;_++)n.append(l[_],P()),v.nextNode(),a.push({type:2,index:++r});n.append(l[g],P())}}}else if(n.nodeType===8)if(n.data===_t)a.push({type:2,index:r});else{let l=-1;for(;(l=n.data.indexOf(y,l+1))!==-1;)a.push({type:7,index:r}),l+=y.length-1}r++}}static createElement(t,e){let s=A.createElement("template");return s.innerHTML=t,s}};function E(i,t,e=i,s){if(t===b)return t;let n=s!==void 0?e._$Co?.[s]:e._$Cl,r=N(t)?void 0:t._$litDirective$;return n?.constructor!==r&&(n?._$AO?.(!1),r===void 0?n=void 0:(n=new r(i),n._$AT(i,e,s)),s!==void 0?(e._$Co??=[])[s]=n:e._$Cl=n),n!==void 0&&(t=E(i,n._$AS(i,t.values),n,s)),t}var F=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:s}=this._$AD,n=(t?.creationScope??A).importNode(e,!0);v.currentNode=n;let r=v.nextNode(),o=0,c=0,a=s[0];for(;a!==void 0;){if(o===a.index){let d;a.type===2?d=new H(r,r.nextSibling,this,t):a.type===1?d=new a.ctor(r,a.name,a.strings,this,t):a.type===6&&(d=new Z(r,this,t)),this._$AV.push(d),a=s[++c]}o!==a?.index&&(r=v.nextNode(),o++)}return v.currentNode=A,n}p(t){let e=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}},H=class i{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,n){this.type=2,this._$AH=h,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=E(this,t,e),N(t)?t===h||t==null||t===""?(this._$AH!==h&&this._$AR(),this._$AH=h):t!==this._$AH&&t!==b&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):qt(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==h&&N(this._$AH)?this._$AA.nextSibling.data=t:this.T(A.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:s}=t,n=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=T.createElement($t(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===n)this._$AH.p(e);else{let r=new F(n,this),o=r.u(this.options);r.p(e),this.T(o),this._$AH=r}}_$AC(t){let e=gt.get(t.strings);return e===void 0&&gt.set(t.strings,e=new T(t)),e}k(t){G(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,s,n=0;for(let r of t)n===e.length?e.push(s=new i(this.O(P()),this.O(P()),this,this.options)):s=e[n],s._$AI(r),n++;n<e.length&&(this._$AR(s&&s._$AB.nextSibling,n),e.length=n)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let s=lt(t).nextSibling;lt(t).remove(),t=s}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},w=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,n,r){this.type=1,this._$AH=h,this._$AN=void 0,this.element=t,this.name=e,this._$AM=n,this.options=r,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=h}_$AI(t,e=this,s,n){let r=this.strings,o=!1;if(r===void 0)t=E(this,t,e,0),o=!N(t)||t!==this._$AH&&t!==b,o&&(this._$AH=t);else{let c=t,a,d;for(t=r[0],a=0;a<r.length-1;a++)d=E(this,c[s+a],e,a),d===b&&(d=this._$AH[a]),o||=!N(d)||d!==this._$AH[a],d===h?t=h:t!==h&&(t+=(d??"")+r[a+1]),this._$AH[a]=d}o&&!n&&this.j(t)}j(t){t===h?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}},W=class extends w{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===h?void 0:t}},K=class extends w{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==h)}},Y=class extends w{constructor(t,e,s,n,r){super(t,e,s,n,r),this.type=5}_$AI(t,e=this){if((t=E(this,t,e,0)??h)===b)return;let s=this._$AH,n=t===h&&s!==h||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,r=t!==h&&(s===h||n);n&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}},Z=class{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){E(this,t)}};var Ft=J.litHtmlPolyfillSupport;Ft?.(T,H),(J.litHtmlVersions??=[]).push("3.3.3");var vt=(i,t,e)=>{let s=e?.renderBefore??t,n=s._$litPart$;if(n===void 0){let r=e?.renderBefore??null;s._$litPart$=n=new H(t.insertBefore(P(),r),r,void 0,e??{})}return n._$AI(i),n};var X=globalThis,m=class extends f{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=vt(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return b}};m._$litElement$=!0,m.finalized=!0,X.litElementHydrateSupport?.({LitElement:m});var Wt=X.litElementPolyfillSupport;Wt?.({LitElement:m});(X.litElementVersions??=[]).push("4.2.2");var x="canvas_lms_edu",At="course_grade",bt="get_unsubmitted_assignments",O="canvas-lms-courses-card";var xt=i=>typeof i=="number"?i:void 0;function Et(i){return i.primary_config_entry??i.config_entry_id??i.config_entries?.[0]??void 0}function wt(i){return i.name_by_user||i.name||""}function Kt(i,t){if(typeof i!="string")return"";let e=i;for(let s of[t?.name_by_user,t?.name])if(s&&e.startsWith(`${s} `)){e=e.slice(s.length+1);break}return e.replace(/ grade$/,"")}function St(i,t,e=new Map){let s=[];for(let r of Object.values(i.entities)){if(r.platform!==x||r.device_id!==t||r.translation_key!==At)continue;let o=i.states[r.entity_id];if(!o)continue;let c=o.attributes,a=e.get(r.entity_id),d=c.teachers,u={entityId:r.entity_id,name:typeof c.course_name=="string"&&c.course_name||a?.name||Kt(c.friendly_name,i.devices[t])||r.entity_id,teachers:Array.isArray(d)?d.filter(l=>typeof l=="string"):a?.teachers??[],state:o.state,courseId:xt(c.course_id)??a?.courseId,studentId:xt(c.student_id)??a?.studentId};e.set(r.entity_id,u),s.push(u)}let n=i.locale?.language||void 0;return s.sort((r,o)=>r.name.localeCompare(o.name,n,{sensitivity:"base"})||r.entityId.localeCompare(o.entityId))}var L="canvas-lms-courses-card-editor",Yt=[{name:"device_id",required:!0,selector:{device:{filter:{integration:x}}}},{name:"title",selector:{text:{}}}],Zt={device_id:"Student",title:"Title (optional)"},tt=class extends m{static{this.properties={hass:{attribute:!1},_config:{state:!0}}}setConfig(t){this._config=t}render(){return this._config?p`<ha-form
      .hass=${this.hass}
      .data=${this._config}
      .schema=${Yt}
      .computeLabel=${t=>Zt[t.name]??t.name}
      @value-changed=${this._changed}
    ></ha-form>`:p``}_changed(t){t.stopPropagation();let e={...this._config,...t.detail.value};e.title||delete e.title,this._config=e,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:e},bubbles:!0,composed:!0}))}};customElements.get(L)||customElements.define(L,tt);function et(i){if(i===void 0||i.trim()==="")return"\u2014";let t=Number(i);return Number.isFinite(t)?`${t}%`:"\u2014"}var Ct=i=>i?.locale?.language||void 0;function Rt(i,t){if(!i)return"";let e=new Date(i);if(Number.isNaN(e.getTime()))return"";let s=t?.locale?.time_zone==="server"?t.config?.time_zone:void 0,n=r=>new Intl.DateTimeFormat(Ct(t),{dateStyle:"medium",timeStyle:"short",timeZone:r}).format(e);try{return n(s)}catch{return n(void 0)}}function Pt(i,t){return i==null?"":`${new Intl.NumberFormat(Ct(t),{maximumFractionDigits:2}).format(i)} ${i===1?"pt":"pts"}`}var Nt=i=>{if(!i.due_at)return null;let t=Date.parse(i.due_at);return Number.isNaN(t)?null:t},Tt=(i,t)=>{let[e,s]=[Nt(i),Nt(t)];return e===s?0:e===null?1:s===null?-1:e-s},Jt=(i,t)=>{let[e,s]=[i.points_possible,t.points_possible];return e===s?0:e==null?1:s==null?-1:s-e},Gt=i=>(t,e)=>(t.name??"").localeCompare(e.name??"",i,{sensitivity:"base"});function Ht(i,t,e){let s=Gt(e),n=t==="points"?Jt:t==="name"?s:Tt;return[...i].sort((r,o)=>n(r,o)||Tt(r,o)||s(r,o)||r.assignment_id-o.assignment_id)}var Ot=j`
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
`;var Qt=[["due","Due date"],["points","Points"],["name","Name"]],Xt="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z",st=class extends m{constructor(){super();this._remembered=new Map;this._request=0;this._sort="due",this._error=!1}static{this.styles=Ot}static{this.properties={hass:{attribute:!1},_config:{state:!0},_open:{state:!0},_sort:{state:!0},_assignments:{state:!0},_error:{state:!0}}}static getConfigElement(){return document.createElement(L)}static getStubConfig(e){let s=Object.values(e?.devices??{}).find(n=>n.identifiers?.some(([r])=>r===x));return s?{device_id:s.id}:{}}setConfig(e){if(!e||typeof e!="object")throw new Error("Invalid configuration");e.device_id!==this._config?.device_id&&(this._close(),this._remembered.clear()),this._config=e}getCardSize(){return Math.max(2,1+this._rows().length)}get _device(){let e=this._config?.device_id;return e?this.hass?.devices?.[e]:void 0}_rows(){let e=this._config?.device_id;return!this.hass||!e?[]:St(this.hass,e,this._remembered)}willUpdate(e){if(!e.has("hass")||!this._open||!this.hass)return;let s=this.hass.states[this._open];s?s!==this._loadedFor&&this._load():this._close()}render(){if(!this._config||!this.hass)return h;if(!this._config.device_id)return this._configError("Choose a student in the card's settings.");let e=this._device;if(!e)return this._configError("The student this card was set up for no longer exists. Choose a student in the card's settings.");let s=this._rows(),n=this._open&&s.find(r=>r.entityId===this._open);return p`<ha-card>
      ${n?this._renderClass(n):this._renderList(s,e)}
    </ha-card>`}_configError(e){return p`<ha-card>
      <p class="message error config-error" role="alert">${e}</p>
    </ha-card>`}_renderList(e,s){let n=this._config?.title||wt(s);return p`
      ${n?p`<div class="header"><h2 class="title">${n}</h2></div>`:h}
      ${e.length===0?p`<p class="message empty">No active classes</p>`:p`<ul class="courses">
            ${e.map(r=>p`<li>
                  <button
                    class="row course"
                    type="button"
                    @click=${()=>this._openClass(r.entityId)}
                  >
                    <span class="text">
                      <span class="primary name">${r.name}</span>
                      <span class="secondary teachers"
                        >${r.teachers.join(", ")}</span
                      >
                    </span>
                    <span class="grade">${et(r.state)}</span>
                  </button>
                </li>`)}
          </ul>`}
    `}_renderClass(e){return p`
      <div class="header">
        <button
          class="back"
          type="button"
          aria-label="Back to classes"
          title="Back to classes"
          @click=${this._back}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${Xt}></path></svg>
        </button>
        <h2 class="title">${e.name}</h2>
        <span class="grade">${et(e.state)}</span>
      </div>
      <div class="sort" role="group" aria-label="Sort assignments">
        <span aria-hidden="true">Sort by</span>
        ${Qt.map(([s,n])=>p`<button
              type="button"
              data-sort=${s}
              aria-pressed=${this._sort===s?"true":"false"}
              @click=${()=>{this._sort=s}}
            >
              ${n}
            </button>`)}
      </div>
      ${this._renderAssignments()}
    `}_renderAssignments(){if(this._error)return p`<p class="message error" role="alert">
        <span>Could not load this class's assignments.</span>
        <button class="retry" type="button" @click=${()=>this._load()}>
          Try again
        </button>
      </p>`;if(this._assignments===void 0)return p`<p class="message loading">Loading…</p>`;if(this._assignments.length===0)return p`<p class="message empty">Nothing to turn in</p>`;let e=Ht(this._assignments,this._sort,this.hass?.locale?.language||void 0);return p`<ul class="assignments">
      ${e.map(s=>{let n=Rt(s.due_at,this.hass),r=Pt(s.points_possible,this.hass),o=p`
          <span class="text">
            <span class="primary name">${s.name??"Untitled assignment"}</span>
            <span class="secondary"
              >${s.missing?p`<span class="missing">Missing</span>`:h}<span class="due">${n?`Due ${n}`:""}</span></span
            >
          </span>
          ${r?p`<span class="points">${r}</span>`:h}
        `;return p`<li>
          ${s.html_url?p`<a
                class="row assignment"
                href=${s.html_url}
                target="_blank"
                rel="noopener noreferrer"
                >${o}</a
              >`:p`<div class="row assignment">${o}</div>`}
        </li>`})}
    </ul>`}_openClass(e){this._open=e,this._load()}_back(){this._close()}_close(){this._request+=1,this._open=void 0,this._assignments=void 0,this._error=!1,this._loadedFor=void 0}async _load(){let e=this.hass,s=this._open;if(!e||!s)return;let n=++this._request;this._loadedFor=e.states[s],this._error=!1;let r=this._remembered.get(s),o=this._device,c=o&&Et(o);try{if(!c||r?.courseId===void 0||r.studentId===void 0)throw new Error("The class's details are not available");let a=await e.callService(x,bt,{config_entry_id:c},void 0,!1,!0);if(n!==this._request)return;let d=a?.response?.assignments;if(!Array.isArray(d))throw new Error("Unexpected response");this._assignments=d.filter(u=>u.student_id===r.studentId&&u.course_id===r.courseId)}catch{if(n!==this._request)return;this._assignments=void 0,this._error=!0}}};customElements.get(O)||customElements.define(O,st);window.customCards=window.customCards??[];window.customCards.some(i=>i.type===O)||window.customCards.push({type:O,name:"Canvas LMS courses",description:"A student's classes with teacher and current grade; open a class to see what has not been turned in.",documentationURL:"https://github.com/ivlo11/canvas-lms-homeassistant/blob/main/docs/courses-card.md"});export{st as CanvasLmsCoursesCard};
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
