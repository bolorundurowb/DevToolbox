import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { welcomeGuard } from './core/guards/welcome.guard';

export const routes: Routes = [
  // First-run / welcome — no shell, no sidebar
  {
    path: 'welcome',
    loadComponent: () => import('./pages/first-run/first-run.component').then(m => m.FirstRunComponent),
  },

  // Shell layout — sidebar + topbar wrapper for all main pages
  {
    path: '',
    component: ShellComponent,
    canActivate: [welcomeGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
      },
      {
        path: 'about',
        loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent),
      },
      {
        path: 'history',
        loadComponent: () => import('./pages/history/history.component').then(m => m.HistoryComponent),
      },
      // Tools
      {
        path: 'tools/json',
        loadComponent: () => import('./tools/json/json.component').then(m => m.JsonComponent),
      },
      {
        path: 'tools/xml',
        loadComponent: () => import('./tools/xml/xml.component').then(m => m.XmlComponent),
      },
      {
        path: 'tools/yaml',
        loadComponent: () => import('./tools/yaml/yaml.component').then(m => m.YamlComponent),
      },
      {
        path: 'tools/sql',
        loadComponent: () => import('./tools/sql/sql.component').then(m => m.SqlComponent),
      },
      {
        path: 'tools/js-beautify',
        loadComponent: () => import('./tools/js-beautify/js-beautify.component').then(m => m.JsBeautifyComponent),
      },
      {
        path: 'tools/markdown',
        loadComponent: () => import('./tools/markdown/markdown.component').then(m => m.MarkdownComponent),
      },
      {
        path: 'tools/diff',
        loadComponent: () => import('./tools/diff/diff.component').then(m => m.DiffComponent),
      },
      {
        path: 'tools/text-case',
        loadComponent: () => import('./tools/text-case/text-case.component').then(m => m.TextCaseComponent),
      },
      {
        path: 'tools/lorem',
        loadComponent: () => import('./tools/lorem/lorem.component').then(m => m.LoremComponent),
      },
      {
        path: 'tools/regex',
        loadComponent: () => import('./tools/regex/regex.component').then(m => m.RegexComponent),
      },
      {
        path: 'tools/base64',
        loadComponent: () => import('./tools/base64/base64.component').then(m => m.Base64Component),
      },
      {
        path: 'tools/url-encode',
        loadComponent: () => import('./tools/url-encode/url-encode.component').then(m => m.UrlEncodeComponent),
      },
      {
        path: 'tools/html-entities',
        loadComponent: () => import('./tools/html-entities/html-entities.component').then(m => m.HtmlEntitiesComponent),
      },
      {
        path: 'tools/jwt',
        loadComponent: () => import('./tools/jwt/jwt.component').then(m => m.JwtComponent),
      },
      {
        path: 'tools/hex',
        loadComponent: () => import('./tools/hex/hex.component').then(m => m.HexComponent),
      },
      {
        path: 'tools/hash',
        loadComponent: () => import('./tools/hash/hash.component').then(m => m.HashComponent),
      },
      {
        path: 'tools/bcrypt',
        loadComponent: () => import('./tools/bcrypt/bcrypt.component').then(m => m.BcryptComponent),
      },
      {
        path: 'tools/uuid',
        loadComponent: () => import('./tools/uuid/uuid.component').then(m => m.UuidComponent),
      },
      {
        path: 'tools/password-gen',
        loadComponent: () => import('./tools/password-gen/password-gen.component').then(m => m.PasswordGenComponent),
      },
      {
        path: 'tools/hmac',
        loadComponent: () => import('./tools/hmac/hmac.component').then(m => m.HmacComponent),
      },
      {
        path: 'tools/img-converter',
        loadComponent: () => import('./tools/img-converter/img-converter.component').then(m => m.ImgConverterComponent),
      },
      {
        path: 'tools/img-resizer',
        loadComponent: () => import('./tools/img-resizer/img-resizer.component').then(m => m.ImgResizerComponent),
      },
      {
        path: 'tools/img-cropper',
        loadComponent: () => import('./tools/img-cropper/img-cropper.component').then(m => m.ImgCropperComponent),
      },
      {
        path: 'tools/svg-optimizer',
        loadComponent: () => import('./tools/svg-optimizer/svg-optimizer.component').then(m => m.SvgOptimizerComponent),
      },
      {
        path: 'tools/svg-exporter',
        loadComponent: () => import('./tools/svg-exporter/svg-exporter.component').then(m => m.SvgExporterComponent),
      },
      {
        path: 'tools/color-tools',
        loadComponent: () => import('./tools/color-tools/color-tools.component').then(m => m.ColorToolsComponent),
      },
      {
        path: 'tools/color-palette',
        loadComponent: () => import('./tools/color-palette/color-palette.component').then(m => m.ColorPaletteComponent),
      },
      {
        path: 'tools/cron',
        loadComponent: () => import('./tools/cron/cron.component').then(m => m.CronComponent),
      },
      {
        path: 'tools/unix-time',
        loadComponent: () => import('./tools/unix-time/unix-time.component').then(m => m.UnixTimeComponent),
      },
      {
        path: 'tools/qr',
        loadComponent: () => import('./tools/qr/qr.component').then(m => m.QrComponent),
      },
      {
        path: 'tools/ip-cidr',
        loadComponent: () => import('./tools/ip-cidr/ip-cidr.component').then(m => m.IpCidrComponent),
      },
      {
        path: 'tools/user-agent',
        loadComponent: () => import('./tools/user-agent/user-agent.component').then(m => m.UserAgentComponent),
      },
      { path: 'tools/rsa-keygen', loadComponent: () => import('./tools/rsa-keygen/rsa-keygen.component').then(m => m.RsaKeygenComponent) },
      { path: 'tools/cert-decoder', loadComponent: () => import('./tools/cert-decoder/cert-decoder.component').then(m => m.CertDecoderComponent) },
      { path: 'tools/aes', loadComponent: () => import('./tools/aes/aes.component').then(m => m.AesComponent) },
      { path: 'tools/csv-json', loadComponent: () => import('./tools/csv-json/csv-json.component').then(m => m.CsvJsonComponent) },
      { path: 'tools/json-toml', loadComponent: () => import('./tools/json-toml/json-toml.component').then(m => m.JsonTomlComponent) },
      { path: 'tools/json-schema', loadComponent: () => import('./tools/json-schema/json-schema.component').then(m => m.JsonSchemaComponent) },
      { path: 'tools/curl-to-code', loadComponent: () => import('./tools/curl-to-code/curl-to-code.component').then(m => m.CurlToCodeComponent) },
      { path: 'tools/openapi-viewer', loadComponent: () => import('./tools/openapi-viewer/openapi-viewer.component').then(m => m.OpenapiViewerComponent) },
      { path: 'tools/datetime-util', loadComponent: () => import('./tools/datetime-util/datetime-util.component').then(m => m.DatetimeUtilComponent) },
      { path: 'tools/unit-converter', loadComponent: () => import('./tools/unit-converter/unit-converter.component').then(m => m.UnitConverterComponent) },
      { path: 'tools/base-converter', loadComponent: () => import('./tools/base-converter/base-converter.component').then(m => m.BaseConverterComponent) },
      { path: 'tools/mock-data', loadComponent: () => import('./tools/mock-data/mock-data.component').then(m => m.MockDataComponent) },
      { path: 'tools/string-escaper', loadComponent: () => import('./tools/string-escaper/string-escaper.component').then(m => m.StringEscaperComponent) },
      { path: 'tools/jwt-builder', loadComponent: () => import('./tools/jwt-builder/jwt-builder.component').then(m => m.JwtBuilderComponent) },
      { path: 'tools/bitwise', loadComponent: () => import('./tools/bitwise/bitwise.component').then(m => m.BitwiseComponent) },
      { path: 'tools/http-status', loadComponent: () => import('./tools/http-status/http-status.component').then(m => m.HttpStatusComponent) },
      { path: 'tools/unix-perms', loadComponent: () => import('./tools/unix-perms/unix-perms.component').then(m => m.UnixPermsComponent) },
      { path: '**', redirectTo: 'home' },
    ],
  },
];
