# Excel Processing Performance Benchmark

대용량 엑셀 파일 처리 성능을 비교 분석하는 Spring Boot 프로젝트입니다.  
**POI 직접 처리** vs **CSV 변환 후 처리** 방식의 성능을 실제 운영 환경 시나리오에서 테스트합니다.

## 🎯 프로젝트 목적

- **실제 운영 시나리오**: 1MB 이상, 수십만~수백만 행의 대용량 엑셀 파일 처리
- **성능 비교 분석**: 처리 시간, 메모리 사용량, CPU 효율성, 안정성
- **최적 방식 도출**: 파일 크기와 데이터 특성에 따른 최적 처리 방식 가이드

## 📋 테스트 시나리오

### 파일 크기별 테스트

| 구분   | 파일 크기        | 행 수        | 설명        |
|------|--------------|------------|-----------|
| 소규모  | 1MB ~ 10MB   | 1천 ~ 1만    | 일반적인 업무용  |
| 중규모  | 10MB ~ 100MB | 1만 ~ 10만   | 중간 규모 데이터 |
| 대규모  | 100MB ~ 1GB  | 10만 ~ 100만 | 대용량 데이터   |
| 초대규모 | 1GB+         | 100만+      | 극한 시나리오   |

### 데이터 복잡도별 테스트

- **단순 데이터**: 텍스트, 숫자만 포함
- **수식 포함**: Excel 함수 및 계산식
- **다중 시트**: 여러 워크시트
- **복잡 포맷**: 스타일, 차트, 이미지 등

## 🏗️ 구현 방식

### 1. 기본 POI 방식

```java
// 전체 파일을 메모리에 로드
XSSFWorkbook workbook = new XSSFWorkbook(inputStream);
```

- **장점**: 구현 간단, 모든 기능 활용 가능
- **단점**: 대용량 파일 시 OutOfMemoryError 위험

### 2. POI 스트리밍 방식

```java
// SAX Parser를 이용한 스트리밍 처리
XSSFReader reader = new XSSFReader(pkg);
parser.setContentHandler(new SheetHandler());
```

- **장점**: 메모리 효율적, 대용량 처리 가능
- **단점**: 구현 복잡도 높음

### 3. CSV 변환 방식 ⭐

```java
// Excel → CSV 변환 후 스트리밍 처리
convertExcelToCSV(inputStream);
processCSVInBatches(csvPath, batchSize);
```

- **장점**: 최고의 메모리 효율성, 처리 속도 빠름
- **단점**: 추가 변환 단계, 단순 데이터만 처리

### 4. 하이브리드 방식

```java
// 파일 크기에 따른 자동 방식 선택
ProcessingStrategy strategy = strategySelector.select(fileSize, complexity);
```

- **장점**: 상황별 최적화
- **단점**: 로직 복잡도 증가

## 📊 측정 메트릭

### 성능 지표

- **처리 시간**: 전체 처리 완료까지 소요 시간
- **메모리 사용량**: 힙/논힙 메모리 최대 사용량
- **CPU 사용률**: 처리 중 평균/최대 CPU 사용률
- **처리량**: 초당 처리 행 수 (rows/sec)
- **디스크 I/O**: 읽기/쓰기 작업량

### 안정성 지표

- **메모리 누수**: 처리 후 메모리 해제 여부
- **에러율**: OutOfMemoryError, TimeoutException 발생률
- **리소스 정리**: 파일 핸들, 커넥션 정상 해제

## 🚀 빠른 시작

### 요구사항

- Java 17+
- Gradle 7.6+
- 메모리: 최소 4GB RAM (대용량 테스트용)

### 설치 및 실행

```bash
# 1. 프로젝트 클론
git clone https://github.com/your-username/excel-benchmark.git
cd excel-benchmark

# 2. 빌드 및 실행
./gradlew bootRun

# 3. 브라우저에서 확인
open http://localhost:8080
```

### JVM 옵션 설정

```bash
# 대용량 테스트를 위한 메모리 설정
export JAVA_OPTS="-Xmx8g -Xms2g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
./gradlew bootRun
```

## 🔧 API 사용법

### 1. 테스트 데이터 생성

```bash
# 크기별 테스트 엑셀 파일 생성
curl -X POST "http://localhost:8080/api/test-data/generate" \
     -H "Content-Type: application/json" \
     -d '{
       "sizes": ["SMALL", "MEDIUM", "LARGE"],
       "complexity": "SIMPLE"
     }'
```

### 2. 벤치마크 실행

```bash
# 파일 업로드 및 모든 방식으로 벤치마크
curl -X POST "http://localhost:8080/api/benchmark/upload" \
     -F "file=@test-data.xlsx" \
     -F "methods=POI_BASIC,POI_STREAMING,CSV_CONVERT"
```

### 3. 결과 조회

```bash
# 벤치마크 결과 조회
curl "http://localhost:8080/api/benchmark/results/12345"

# 방식별 성능 비교
curl "http://localhost:8080/api/benchmark/compare?fileSize=LARGE"
```

### 4. 실시간 모니터링

```bash
# 메모리 사용량 실시간 조회
curl "http://localhost:8080/api/metrics/memory"

# 처리 진행률 확인
curl "http://localhost:8080/api/benchmark/progress/12345"
```

## 📈 대시보드

### 실시간 모니터링

- **처리 진행률**: 실시간 진행 상황
- **메모리 사용량**: 힙/논힙 메모리 그래프
- **CPU 사용률**: 실시간 CPU 모니터링
- **처리 속도**: 초당 처리 행 수

### 성능 비교 차트

- **처리 시간 비교**: 방식별 소요 시간
- **메모리 효율성**: 최대 메모리 사용량
- **확장성**: 파일 크기별 성능 추이

접속: `http://localhost:8080/dashboard`

## 🧪 테스트 실행

### 단위 테스트

```bash
# 각 처리 방식별 단위 테스트
./gradlew test --tests "ExcelProcessorTest"
```

### 통합 테스트

```bash
# 전체 벤치마크 파이프라인 테스트
./gradlew integrationTest
```

### 부하 테스트

```bash
# 대용량 파일 부하 테스트 (메모리 4GB+ 권장)
./gradlew loadTest -Pprofile=large
```

## ⚙️ 설정

### application.yml

```yaml
excel-benchmark:
  # 처리 설정
  batch-size: 5000              # 배치 크기
  max-threads: 4                # 최대 처리 스레드
  timeout-minutes: 30           # 처리 타임아웃
  
  # 메모리 설정
  memory-threshold: 85          # 메모리 사용률 임계값 (%)
  gc-trigger-threshold: 80      # GC 트리거 임계값 (%)
  
  # 파일 설정
  temp-dir: ./temp              # 임시 파일 디렉토리
  max-file-size: 1GB            # 최대 파일 크기
  
  # 메트릭 설정
  metrics:
    collection-interval: 1s     # 메트릭 수집 주기
    retention-days: 7           # 결과 보관 기간
```

## 📊 예상 결과

### 메모리 사용량 비교 (예상)

| 파일 크기   | 기본 POI      | POI 스트리밍 | CSV 변환    |
|---------|-------------|----------|-----------|
| 10만 행   | ~500MB      | ~50MB    | **~20MB** |
| 100만 행  | OutOfMemory | ~100MB   | **~30MB** |
| 1000만 행 | OutOfMemory | ~200MB   | **~50MB** |

### 처리 시간 비교 (예상)

- **소규모 파일**: POI 기본 방식이 가장 빠름
- **중대규모 파일**: CSV 변환 방식이 우수
- **초대규모 파일**: CSV 변환 방식만 안정적 처리

## 🤝 기여 방법

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 참고 자료

- [Apache POI Documentation](https://poi.apache.org/)
- [Apache Commons CSV](https://commons.apache.org/proper/commons-csv/)
- [Spring Boot Performance Tuning](https://spring.io/guides/gs/actuator-service/)
- [JVM Memory Tuning Guide](https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/)

---

## 📞 문의

프로젝트 관련 문의사항이나 이슈는 [GitHub Issues](https://github.com/your-username/excel-benchmark/issues)를 통해 남겨주세요.
