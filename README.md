# VMU Campus Tour 3D — Giai Đoạn 2 Hoàn Chỉnh (Lô A + B + C)

Ứng dụng Web 3D tham quan tự do khuôn viên **Trường Đại học Hàng Hải Việt Nam (484 Lạch Tray, Hải Phòng)** theo phong cách Low-Poly Stylized hiện đại, ánh sáng hoàng hôn dịu ấm, tối ưu hiệu năng cao cho cả Desktop và Mobile tầm trung.

## 1. Hướng dẫn giải nén và chạy ngay

Mở Terminal / Command Prompt tại thư mục dự án và chạy:

```bash
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:5173` (hoặc địa chỉ IP mạng LAN hiển thị trên terminal để mở trên điện thoại).

## 2. Các hạng mục đã hoàn thiện trong Giai đoạn 2
- **Lô A (Nền & Môi trường)**:
  - `src/data/campusLayout.json`: Nguồn dữ liệu duy nhất cho toàn bộ khuôn viên 320x280m (gốc `(0,0,0)` tại Cổng vòm Parabol).
  - Mặt đất, sân nhựa bãi đỗ xe, đường nội bộ, vạch kẻ, 10 xe ô tô đỗ (`InstancedMesh`).
  - Sân vận động (`SoccerField.tsx`) với `CanvasTexture` cỏ sọc, vạch vôi trắng, khung thành và khán đài có mái che.
  - Hồ nước điều hòa (`CampusLake.tsx`) góc Tây Bắc có shader sóng nước, bờ kè trắng và `CuboidCollider`.
  - Hàng rào bao khuôn viên (`PerimeterFence.tsx`) gộp hình học tĩnh bằng `mergeGeometries` (chỉ tốn 2 draw calls).
  - Cây cối (`CampusFoliage.tsx`) dùng `InstancedMesh` cho 3 loại cây: Hàng cọ, Cây cổ thụ tán rộng, Cây hoa phượng đỏ kèm đèn đường và ghế đá.
- **Lô B (Công trình & Landmark đặc trưng VMU)**:
  - `ProceduralBuilding.tsx` + `windowTextures.ts`: Tham số hóa 17 tòa nhà (mái `hip`, `gable`, `flat`, `arched-roof`, `courtyard-hip`; cửa sổ `CanvasTexture` kèm `emissiveMap`; sảnh đón 4 cột trắng; cánh kính xanh; ban công; biển chữ trên mái; tự động chuyển sang nạp `.glb` nếu khai báo `modelPath`).
  - `ArchGate.tsx`: Cổng vòm Parabol trắng tại gốc `(0,0,0)` đường Lạch Tray + bảng tên trường + bốt bảo vệ.
  - `MonumentBanhLai.tsx`: 2 trụ trắng song song + Bánh lái tàu vàng (Torus + 8 nan hoa) + Cuốn sách mở `"VMU | 1/4/1956"` + Mỏ neo vàng + 3 cột cờ có cờ bay bằng Vertex Shader.
  - `StarPlaza.tsx` & `GlobeFountain.tsx`: Quảng trường ngôi sao 8 cánh (`ExtrudeGeometry`), rãnh nước, 4 cầu dẫn lên đài trung tâm, bồn cây cắt tỉa tròn và Quả địa cầu vàng nghiêng trục xoay nhẹ ở tâm.
  - `DomeTower.tsx`: Trống trụ trắng có cửa sổ nhỏ và mái vòm bán cầu xanh dương chia múi kinh tuyến trên nóc tòa A2.
- **Lô C (Ánh sáng hoàng hôn, Hiệu năng & Nhân vật Low-Poly)**:
  - `LightingAndSky.tsx` + `App.tsx`: Ánh sáng hoàng hôn ấm, Sky, sương mù nhẹ, khóa `ACESFilmicToneMapping` và `SRGBColorSpace`, đổ bóng mặt trời bám theo vị trí người chơi (`Player-Following Shadow Frustum`).
  - `useQualityTier.ts`: Tự động nhận diện thiết bị (`low` / `medium` / `high`) để điều chỉnh `dpr`, `shadowMapSize` và mật độ cây.
  - `LowPolyCharacter.tsx`: Nhân vật sinh viên Hàng Hải Low-Poly dựng từ primitive có animation đi bộ đánh tay chân và đứng thở tự nhiên (thay thế khối capsule hiển thị, giữ nguyên `CapsuleCollider`).
