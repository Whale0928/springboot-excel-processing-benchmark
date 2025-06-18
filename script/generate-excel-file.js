#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const inquirer = require('inquirer');

// 색상 출력을 위한 유틸리티
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    header: (msg) => console.log(`${colors.bright}${colors.cyan}🚀 ${msg}${colors.reset}`)
};

// 리소스 폴더 경로 (상대경로)
const RESOURCES_PATH = path.join(__dirname, '..', 'src', 'main', 'resources');

// 더미 데이터 생성 함수들
const dataGenerators = {
    // 개인정보 더미 데이터
    generatePersonData: (rowIndex) => ({
        id: `EMP${String(rowIndex).padStart(6, '0')}`,
        firstName: `FirstName${rowIndex}`,
        lastName: `LastName${rowIndex}`,
        email: `user${rowIndex}@company.com`,
        department: ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'][rowIndex % 5],
        salary: Math.floor(Math.random() * 100000) + 30000,
        hireDate: new Date(2020 + (rowIndex % 4), rowIndex % 12, (rowIndex % 28) + 1).toISOString().split('T')[0],
        city: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Gwangju'][rowIndex % 5],
        phone: `010-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        status: ['Active', 'Inactive'][rowIndex % 2]
    }),

    // 판매 데이터
    generateSalesData: (rowIndex) => ({
        orderId: `ORD${String(rowIndex).padStart(8, '0')}`,
        productName: `Product ${String.fromCharCode(65 + (rowIndex % 26))}${rowIndex % 1000}`,
        category: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'][rowIndex % 5],
        quantity: Math.floor(Math.random() * 50) + 1,
        unitPrice: Math.floor(Math.random() * 100000) + 1000,
        totalAmount: 0, // 계산될 예정
        orderDate: new Date(2024, rowIndex % 12, (rowIndex % 28) + 1).toISOString().split('T')[0],
        customerName: `Customer${rowIndex}`,
        region: ['North', 'South', 'East', 'West', 'Central'][rowIndex % 5],
        salesRep: `Rep${rowIndex % 20}`
    }),

    // 재무 데이터
    generateFinanceData: (rowIndex) => ({
        transactionId: `TXN${String(rowIndex).padStart(10, '0')}`,
        accountNumber: `ACC${String(rowIndex % 10000).padStart(6, '0')}`,
        transactionType: ['Debit', 'Credit'][rowIndex % 2],
        amount: Math.floor(Math.random() * 1000000) + 100,
        currency: ['KRW', 'USD', 'EUR', 'JPY'][rowIndex % 4],
        description: `Transaction description for ${rowIndex}`,
        transactionDate: new Date(2024, rowIndex % 12, (rowIndex % 28) + 1),
        branch: `Branch${(rowIndex % 50) + 1}`,
        category: ['Operating', 'Investment', 'Financing'][rowIndex % 3],
        balance: Math.floor(Math.random() * 10000000)
    })
};

// 사용 가능한 폴더 스캔
async function getAvailableFolders() {
    try {
        const items = fs.readdirSync(RESOURCES_PATH, {withFileTypes: true});
        return items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .sort();
    } catch (error) {
        log.error(`폴더 스캔 실패: ${error.message}`);
        return [];
    }
}

// 파일 크기를 MB로 계산
function formatFileSize(bytes) {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
}

// 대략적인 행 수 추정 (목표 크기 기반)
function estimateRows(targetMB, columns) {
    // 엑셀 오버헤드를 고려한 대략적 계산
    // 평균적으로 한 행당 약 100-200 바이트 (컬럼 수에 따라)
    const avgBytesPerRow = columns * 15; // 컬럼당 평균 15바이트
    const targetBytes = targetMB * 1024 * 1024;
    return Math.floor(targetBytes / avgBytesPerRow);
}

// 엑셀 파일 생성
async function generateExcelFile(options) {
    const {targetMB, maxRows, dataType, folderName, fileName} = options;

    log.header(`엑셀 파일 생성 시작`);
    log.info(`목표 크기: ${targetMB}MB`);
    log.info(`최대 행 수: ${maxRows.toLocaleString()}`);
    log.info(`데이터 타입: ${dataType}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('TestData');

    // 데이터 생성기 선택
    const generator = dataGenerators[dataType];
    const sampleData = generator(1);
    const columns = Object.keys(sampleData);

    // 헤더 설정
    worksheet.columns = columns.map(col => ({
        header: col.charAt(0).toUpperCase() + col.slice(1),
        key: col,
        width: 15
    }));

    // 헤더 스타일링
    worksheet.getRow(1).font = {bold: true};
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {argb: 'FFE0E0E0'}
    };

    log.info('데이터 생성 중...');

    const estimatedRows = Math.min(estimateRows(targetMB, columns.length), maxRows);
    let currentRow = 0;
    let currentSize = 0;
    const targetBytes = targetMB * 1024 * 1024;

    // 배치 단위로 데이터 추가
    const batchSize = 1000;
    const progressInterval = Math.max(1, Math.floor(estimatedRows / 20)); // 5% 간격으로 진행률 표시

    while (currentRow < maxRows && currentSize < targetBytes) {
        const batch = [];

        for (let i = 0; i < batchSize && currentRow < maxRows; i++, currentRow++) {
            const rowData = generator(currentRow + 1);

            // totalAmount 계산 (판매 데이터의 경우)
            if (dataType === 'generateSalesData') {
                rowData.totalAmount = rowData.quantity * rowData.unitPrice;
            }

            batch.push(Object.values(rowData));

            // 진행률 표시
            if (currentRow % progressInterval === 0) {
                const progress = ((currentRow / estimatedRows) * 100).toFixed(1);
                process.stdout.write(`\r${colors.blue}진행률: ${progress}% (${currentRow.toLocaleString()} / ${estimatedRows.toLocaleString()} 행)${colors.reset}`);
            }
        }

        // 배치 추가
        worksheet.addRows(batch);

        // 현재 메모리 사용량 추정 (대략적)
        currentSize = currentRow * columns.length * 20; // 대략적 계산

        // 목표 크기 도달 시 중단
        if (currentSize >= targetBytes) {
            log.info(`\n목표 크기 ${targetMB}MB 도달. 생성 완료.`);
            break;
        }
    }

    console.log(); // 새 줄
    log.info(`총 ${currentRow.toLocaleString()}행 생성 완료`);

    // 파일 저장
    const filePath = path.join(RESOURCES_PATH, folderName, fileName);

    log.info('파일 저장 중...');
    await workbook.xlsx.writeFile(filePath);

    // 실제 파일 크기 확인
    const stats = fs.statSync(filePath);
    const actualSize = formatFileSize(stats.size);

    log.success(`파일 생성 완료!`);
    log.info(`저장 위치: ${filePath}`);
    log.info(`실제 크기: ${actualSize}`);
    log.info(`총 행 수: ${currentRow.toLocaleString()}`);
    log.info(`총 컬럼 수: ${columns.length}`);
}

// 메인 함수
async function main() {
    console.clear();
    log.header('Spring Boot Excel Processing Benchmark - 테스트 파일 생성기');
    console.log();

    try {
        // 1. 사용 가능한 폴더 확인
        const folders = await getAvailableFolders();
        if (folders.length === 0) {
            log.error('사용 가능한 폴더가 없습니다.');
            process.exit(1);
        }

        log.info(`사용 가능한 폴더: ${folders.join(', ')}`);
        console.log();

        // 2. 사용자 입력 받기
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'folderName',
                message: '저장할 폴더를 선택하세요:',
                choices: folders.map(folder => ({
                    name: `${folder}/ 폴더`,
                    value: folder
                }))
            },
            {
                type: 'input',
                name: 'targetMB',
                message: '목표 파일 크기를 입력하세요 (MB):',
                default: '10',
                validate: (input) => {
                    const num = parseFloat(input);
                    if (isNaN(num) || num <= 0) {
                        return '0보다 큰 숫자를 입력해주세요.';
                    }
                    if (num > 1000) {
                        return '1000MB(1GB) 이하로 입력해주세요.';
                    }
                    return true;
                }
            },
            {
                type: 'input',
                name: 'maxRows',
                message: '최대 행 수를 입력하세요:',
                default: '100000',
                validate: (input) => {
                    const num = parseInt(input);
                    if (isNaN(num) || num <= 0) {
                        return '0보다 큰 정수를 입력해주세요.';
                    }
                    if (num > 10000000) {
                        return '1000만 행 이하로 입력해주세요.';
                    }
                    return true;
                }
            },
            {
                type: 'list',
                name: 'dataType',
                message: '생성할 데이터 타입을 선택하세요:',
                choices: [
                    {name: '👥 개인정보 데이터 (직원 정보)', value: 'generatePersonData'},
                    {name: '💰 판매 데이터 (주문 정보)', value: 'generateSalesData'},
                    {name: '🏦 재무 데이터 (거래 정보)', value: 'generateFinanceData'}
                ]
            },
            {
                type: 'input',
                name: 'fileName',
                message: '파일명을 입력하세요 (.xlsx 확장자 자동 추가):',
                default: () => `test-data-${Date.now()}`,
                validate: (input) => {
                    if (!input.trim()) {
                        return '파일명을 입력해주세요.';
                    }
                    // 특수문자 제거
                    const cleaned = input.replace(/[<>:"/\\|?*]/g, '');
                    if (cleaned !== input) {
                        return '파일명에 특수문자는 사용할 수 없습니다.';
                    }
                    return true;
                }
            }
        ]);

        // 파일명에 .xlsx 확장자 추가
        const fileName = answers.fileName.endsWith('.xlsx')
            ? answers.fileName
            : `${answers.fileName}.xlsx`;

        // 3. 파일 생성
        await generateExcelFile({
            targetMB: parseFloat(answers.targetMB),
            maxRows: parseInt(answers.maxRows),
            dataType: answers.dataType,
            folderName: answers.folderName,
            fileName: fileName
        });

        console.log();
        log.success('🎉 엑셀 파일 생성이 완료되었습니다!');
        log.info('이제 Spring Boot 애플리케이션에서 벤치마크를 실행할 수 있습니다.');

    } catch (error) {
        log.error(`오류 발생: ${error.message}`);
        process.exit(1);
    }
}

// 프로그램 실행
if (require.main === module) {
    main().catch(error => {
        log.error(`예상치 못한 오류: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {main, generateExcelFile, dataGenerators};
