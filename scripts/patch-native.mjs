import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const platform=process.argv[2];

async function patchIOS(){
  const plist=path.join(root,'ios','App','App','Info.plist');
  let p=await fs.readFile(plist,'utf8');
  const dictInsert=(key,xml)=>{
    if(p.includes(`<key>${key}</key>`))return;
    p=p.replace('</dict>\n</plist>',`\t<key>${key}</key>\n${xml}\n</dict>\n</plist>`);
  };
  dictInsert('NSMicrophoneUsageDescription','\t<string>Infected Voices needs microphone access only when you choose to record vocals or use collaboration voice chat.</string>');
  dictInsert('ITSAppUsesNonExemptEncryption','\t<false/>');
  dictInsert('LSSupportsOpeningDocumentsInPlace','\t<true/>');
  dictInsert('CFBundleURLTypes','\t<array>\n\t\t<dict>\n\t\t\t<key>CFBundleTypeRole</key><string>Editor</string>\n\t\t\t<key>CFBundleURLSchemes</key><array><string>infectedvoices</string></array>\n\t\t</dict>\n\t</array>');
  await fs.writeFile(plist,p);

  const privacy=path.join(root,'ios','App','App','PrivacyInfo.xcprivacy');
  await fs.writeFile(privacy,`<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n<key>NSPrivacyTracking</key><false/>\n<key>NSPrivacyTrackingDomains</key><array/>\n<key>NSPrivacyCollectedDataTypes</key><array>\n<dict><key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeName</string><key>NSPrivacyCollectedDataTypeLinked</key><true/><key>NSPrivacyCollectedDataTypeTracking</key><false/><key>NSPrivacyCollectedDataTypePurposes</key><array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array></dict>\n<dict><key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeEmailAddress</string><key>NSPrivacyCollectedDataTypeLinked</key><true/><key>NSPrivacyCollectedDataTypeTracking</key><false/><key>NSPrivacyCollectedDataTypePurposes</key><array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array></dict>\n<dict><key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeUserID</string><key>NSPrivacyCollectedDataTypeLinked</key><true/><key>NSPrivacyCollectedDataTypeTracking</key><false/><key>NSPrivacyCollectedDataTypePurposes</key><array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array></dict>\n<dict><key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeAudioData</string><key>NSPrivacyCollectedDataTypeLinked</key><true/><key>NSPrivacyCollectedDataTypeTracking</key><false/><key>NSPrivacyCollectedDataTypePurposes</key><array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array></dict>\n</array>\n<key>NSPrivacyAccessedAPITypes</key><array/>\n</dict></plist>\n`);

  const appIconDir=path.join(root,'ios','App','App','Assets.xcassets','AppIcon.appiconset');
  await fs.mkdir(appIconDir,{recursive:true});
  await fs.copyFile(path.join(root,'assets','app-icon.png'),path.join(appIconDir,'AppIcon-512@2x.png'));
  await fs.writeFile(path.join(appIconDir,'Contents.json'),JSON.stringify({images:[{filename:'AppIcon-512@2x.png',idiom:'universal',platform:'ios',size:'1024x1024'}],info:{author:'xcode',version:1}},null,2)+'\n');

  const splashDir=path.join(root,'ios','App','App','Assets.xcassets','Splash.imageset');
  try{
    await fs.access(splashDir);
    for(const name of ['splash-2732x2732.png','splash-2732x2732-1.png','splash-2732x2732-2.png']){
      await fs.copyFile(path.join(root,'assets','app-splash.png'),path.join(splashDir,name));
    }
  }catch{}

  const projectPath=path.join(root,'ios','App','App.xcodeproj','project.pbxproj');
  const project=await fs.readFile(projectPath,'utf8');
  const targetMatch=project.match(/([A-F0-9]{24}) \/\* App \*\/ = \{\s*isa = PBXNativeTarget;/);
  if(!targetMatch)throw Error('Could not locate the iOS App target for the shared scheme.');
  const targetId=targetMatch[1];
  const schemeDir=path.join(root,'ios','App','App.xcodeproj','xcshareddata','xcschemes');
  await fs.mkdir(schemeDir,{recursive:true});
  const ref=`<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${targetId}" BuildableName="App.app" BlueprintName="App" ReferencedContainer="container:App.xcodeproj"></BuildableReference>`;
  const scheme=`<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="1600" version="1.7">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">${ref}</BuildActionEntry></BuildActionEntries></BuildAction>
<TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.DebuggerFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables/></TestAction>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.DebuggerFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">${ref}</BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">${ref}</BuildableProductRunnable></ProfileAction>
<AnalyzeAction buildConfiguration="Debug"/>
<ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
`;
  await fs.writeFile(path.join(schemeDir,'App.xcscheme'),scheme);
  console.log('Patched Apple permissions, URL scheme, privacy manifest, shared scheme and artwork.');
}

function setApplicationAttribute(xml,name,value){
  const attr=`android:${name}`;
  const rx=new RegExp(attr+'="[^"]*"');
  if(rx.test(xml))return xml.replace(rx,`${attr}="${value}"`);
  return xml.replace('<application',`<application\n        ${attr}="${value}"`);
}

async function patchAndroid(){
  const appDir=path.join(root,'android','app');
  const mainDir=path.join(appDir,'src','main');
  const manifestPath=path.join(mainDir,'AndroidManifest.xml');
  let manifest=await fs.readFile(manifestPath,'utf8');

  const permissionBlock=[
    '<uses-feature android:name="android.hardware.microphone" android:required="false" />',
    '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
    '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />'
  ].filter(line=>!manifest.includes(line)).join('\n    ');
  if(permissionBlock){
    manifest=manifest.replace(/(<manifest\b[^>]*>)/,`$1\n    ${permissionBlock}`);
  }

  manifest=setApplicationAttribute(manifest,'allowBackup','false');
  manifest=setApplicationAttribute(manifest,'usesCleartextTraffic','false');
  manifest=setApplicationAttribute(manifest,'networkSecurityConfig','@xml/network_security_config');

  if(!manifest.includes('android:scheme="infectedvoices"')){
    const deepLink=`
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="infectedvoices" />
            </intent-filter>`;
    manifest=manifest.replace(/(<intent-filter>[\s\S]*?android\.intent\.action\.MAIN[\s\S]*?<\/intent-filter>)/,`$1${deepLink}`);
  }
  await fs.writeFile(manifestPath,manifest);

  const xmlDir=path.join(mainDir,'res','xml');
  await fs.mkdir(xmlDir,{recursive:true});
  await fs.writeFile(path.join(xmlDir,'network_security_config.xml'),`<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n    <base-config cleartextTrafficPermitted="false" />\n</network-security-config>\n`);

  const varsPath=path.join(root,'android','variables.gradle');
  let vars=await fs.readFile(varsPath,'utf8');
  vars=vars.replace(/compileSdkVersion\s*=\s*\d+/,'compileSdkVersion = 36');
  vars=vars.replace(/targetSdkVersion\s*=\s*\d+/,'targetSdkVersion = 36');
  await fs.writeFile(varsPath,vars);

  const buildPath=path.join(appDir,'build.gradle');
  let build=await fs.readFile(buildPath,'utf8');
  build=build.replace(/versionCode\s+\d+/,'versionCode 1');
  build=build.replace(/versionName\s+["'][^"']+["']/,'versionName "0.6.5"');
  await fs.writeFile(buildPath,build);

  const densityAssets={
    mdpi:'android-icon-mdpi.png',
    hdpi:'android-icon-hdpi.png',
    xhdpi:'android-icon-xhdpi.png',
    xxhdpi:'android-icon-xxhdpi.png',
    xxxhdpi:'android-icon-xxxhdpi.png'
  };
  for(const [density,file] of Object.entries(densityAssets)){
    const dir=path.join(mainDir,'res','mipmap-'+density);
    try{
      await fs.access(dir);
      for(const name of ['ic_launcher.png','ic_launcher_round.png']){
        const target=path.join(dir,name);
        try{await fs.access(target);await fs.copyFile(path.join(root,'assets',file),target);}catch{}
      }
    }catch{}
  }

  async function replaceSplashes(dir){
    let entries=[];
    try{entries=await fs.readdir(dir,{withFileTypes:true});}catch{return;}
    for(const e of entries){
      const p=path.join(dir,e.name);
      if(e.isDirectory())await replaceSplashes(p);
      else if(e.name==='splash.png')await fs.copyFile(path.join(root,'assets','app-splash.png'),p);
    }
  }
  await replaceSplashes(path.join(mainDir,'res'));

  console.log('Patched Android microphone permissions, HTTPS-only networking, deep links, API 36 target and artwork.');
}

if(platform==='ios')await patchIOS();
else if(platform==='android')await patchAndroid();
else throw Error('Choose ios or android.');
